import "server-only";

import { createModuleLogger } from "@/lib/logger";
import {
  getMapboxRoutes,
  searchPlaces,
  reverseGeocode,
  type MapboxRoute,
} from "@/server/integrations/mapbox";
import type {
  PlaceDto,
  RouteAlternativeDto,
  RouteDto,
  RoutePrefer,
  TravelMode,
} from "@/lib/types";
import { DEFAULT_TRAVEL_MODE } from "@/lib/types";
import { MOCK_ROUTE, findPlace, haversineKm } from "@/server/integrations/mocks/data";
import { TRAVEL_SPEED_KMH } from "@/lib/utils";
import { fetchWeatherBatch } from "@/server/integrations/weather";
import type { DateLocale } from "@/lib/dates";
import { getDictionary } from "@/i18n/get-dictionary";
import { createTranslator } from "@/i18n/translate";
import {
  addHoursToLocalKey,
  findBestDeparture,
  formatClock,
  lookupHourly,
  normalizeHourKey,
  type CorridorSample,
} from "@/server/services/route-corridor";
import type { Translator } from "@/i18n/translate";
import {
  isLinkableDestinationId,
  isMapboxFeatureId,
} from "@/lib/discover-query";
import { resolveInternalPlace } from "@/server/dal/place-resolve";
import {
  buildWeatherAdvisories,
  toneFromAdvisories,
} from "@/lib/weather-advisories";
import { windowRainRisk } from "@/server/services/weather-service";
import { CITY_INDEX } from "@/server/integrations/places/city-index";

const log = createModuleLogger("server.services.location-service");
function durationMinutesFromSeconds(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60));
}

function formatDurationLabel(totalMinutes: number, t: Translator): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return t("routes.durationMinutes", { m: minutes });
  if (minutes === 0) return t("routes.durationHours", { h: hours });
  return t("routes.durationHoursMinutes", { h: hours, m: minutes });
}

/** Nearest catalog city within maxKm, skipping reserved names (start/end/other mids). */
function nearestCatalogCityName(
  lat: number,
  lon: number,
  reserved: Set<string>,
  maxKm = 80,
): string | null {
  let bestName: string | null = null;
  let bestKm = Infinity;
  for (const city of CITY_INDEX) {
    const key = city.name.toLowerCase();
    if (reserved.has(key)) continue;
    const d = haversineKm({ lat, lon }, city);
    if (d < bestKm && d <= maxKm) {
      bestKm = d;
      bestName = city.name;
    }
  }
  return bestName;
}

async function nameMidpoint(
  lat: number,
  lon: number,
  reserved: Set<string>,
  fallback: string,
): Promise<string> {
  try {
    const place = await reverseGeocode(lat, lon);
    const candidate = place.name?.trim();
    if (candidate && !reserved.has(candidate.toLowerCase())) {
      return candidate;
    }
  } catch {
    // fall through
  }
  return nearestCatalogCityName(lat, lon, reserved) ?? fallback;
}

function fallbackDurationSeconds(distanceKm: number, mode: TravelMode): number {
  const speed = TRAVEL_SPEED_KMH[mode];
  return Math.max(5, Math.round((distanceKm / speed) * 3600));
}

function pointAlong(
  geometry: [number, number][],
  t: number,
): { lon: number; lat: number } {
  if (geometry.length === 0) return { lon: 0, lat: 0 };
  const idx = Math.min(
    geometry.length - 1,
    Math.max(0, Math.round((geometry.length - 1) * t)),
  );
  const [lon, lat] = geometry[idx]!;
  return { lon, lat };
}

async function resolveEndpoint(
  query: string,
  coords?: { lat: number; lon: number },
  placeId?: string,
): Promise<PlaceDto> {
  if (placeId && isLinkableDestinationId(placeId)) {
    try {
      const { getPlaceById } = await import("@/server/dal/places");
      const byId = await getPlaceById(placeId);
      if (byId) {
        return {
          id: byId.id,
          name: byId.name,
          placeName: byId.placeName,
          country: byId.country ?? undefined,
          countryCode: byId.countryCode ?? undefined,
          lat: coords?.lat ?? byId.lat,
          lon: coords?.lon ?? byId.lon,
          kind: "place",
        };
      }
    } catch {
      // fall through
    }
    const fromMock = findPlace(placeId) ?? findPlace(query);
    if (fromMock) {
      return {
        ...fromMock,
        lat: coords?.lat ?? fromMock.lat,
        lon: coords?.lon ?? fromMock.lon,
      };
    }
  }

  if (
    coords &&
    Number.isFinite(coords.lat) &&
    Number.isFinite(coords.lon)
  ) {
    const internal = await resolveInternalPlace({
      id: placeId,
      name: query.split(",")[0]?.trim() || query,
      placeName: query,
      lat: coords.lat,
      lon: coords.lon,
    });
    if (internal) {
      return {
        ...internal,
        lat: coords.lat,
        lon: coords.lon,
        placeName: query,
      };
    }

    const named =
      findPlace(query) ??
      (await searchPlaces(query, { limit: 1, mode: "precise" }))[0];
    if (
      named &&
      Math.abs(named.lat - coords.lat) < 0.08 &&
      Math.abs(named.lon - coords.lon) < 0.08
    ) {
      const resolvedId = isLinkableDestinationId(named.id)
        ? named.id
        : isMapboxFeatureId(named.id)
          ? `coord-${coords.lat.toFixed(5)},${coords.lon.toFixed(5)}`
          : named.id;
      return {
        ...named,
        id: resolvedId,
        lat: coords.lat,
        lon: coords.lon,
      };
    }

    return {
      id: `coord-${coords.lat.toFixed(5)},${coords.lon.toFixed(5)}`,
      name: query.split(",")[0]?.trim() || query,
      placeName: query,
      lat: coords.lat,
      lon: coords.lon,
      kind: "address",
    };
  }

  const searched =
    findPlace(query) ??
    (await searchPlaces(query, { limit: 1, mode: "precise" }))[0] ??
    MOCK_ROUTE.from;

  if (isLinkableDestinationId(searched.id)) return searched;

  const internal = await resolveInternalPlace({
    id: searched.id,
    name: searched.name,
    placeName: searched.placeName,
    lat: searched.lat,
    lon: searched.lon,
  });
  if (internal) {
    return { ...searched, id: internal.id };
  }

  return {
    ...searched,
    id: isMapboxFeatureId(searched.id)
      ? `coord-${searched.lat.toFixed(5)},${searched.lon.toFixed(5)}`
      : searched.id,
  };
}

function sampleFractions(durationHours: number, distanceKm: number): number[] {
  if (durationHours >= 3 || distanceKm >= 200) {
    return [0, 0.25, 0.5, 0.75, 1];
  }
  if (durationHours >= 1.2 || distanceKm >= 80) {
    return [0, 0.5, 1];
  }
  return [0, 1];
}

/** Coarser samples when comparing several Mapbox alternatives. */
function compareFractions(durationHours: number, distanceKm: number): number[] {
  if (durationHours >= 2 || distanceKm >= 120) return [0, 0.33, 0.66, 1];
  return [0, 0.5, 1];
}

function pointsAlongRoute(
  from: PlaceDto,
  to: PlaceDto,
  geometry: [number, number][] | undefined,
  fractions: number[],
): Array<{ lat: number; lon: number; t: number }> {
  return fractions.map((frac) => {
    if (frac <= 0) return { lat: from.lat, lon: from.lon, t: 0 };
    if (frac >= 1) return { lat: to.lat, lon: to.lon, t: 1 };
    if (geometry?.length) {
      const p = pointAlong(geometry, frac);
      return { lat: p.lat, lon: p.lon, t: frac };
    }
    return {
      lat: from.lat + (to.lat - from.lat) * frac,
      lon: from.lon + (to.lon - from.lon) * frac,
      t: frac,
    };
  });
}

function weatherGridKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

export async function getRouteWeather(
  fromQuery: string,
  toQuery: string,
  opts?: {
    fromLat?: number;
    fromLon?: number;
    toLat?: number;
    toLon?: number;
    fromId?: string;
    toId?: string;
    mode?: TravelMode;
    locale?: DateLocale;
    /** Pro: do not suggest departures before this local hour (0–23). */
    earliestDepartureHour?: number | null;
    datePreset?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    /** `fast` = Mapbox primary; `weather` = driest among alternatives. */
    prefer?: RoutePrefer;
    /** Manual override: Mapbox alternative index (0 = primary). */
    altIndex?: number | null;
  },
): Promise<RouteDto> {
  const mode = opts?.mode ?? DEFAULT_TRAVEL_MODE;
  const locale = opts?.locale ?? "en";
  const prefer: RoutePrefer = "fast";
  const manualAlt =
    opts?.altIndex != null &&
    Number.isInteger(opts.altIndex) &&
    opts.altIndex >= 0
      ? opts.altIndex
      : null;
  const t = createTranslator(getDictionary(locale));
  // Default selection is the fastest Mapbox alternative; `altIndex` lets the
  // user pick another corridor from the comparison cards.

  const datePresetRaw = opts?.datePreset;
  const datePreset =
    datePresetRaw === "today" ||
    datePresetRaw === "tomorrow" ||
    datePresetRaw === "weekend" ||
    datePresetRaw === "custom"
      ? datePresetRaw
      : opts?.startDate
        ? "custom"
        : "weekend";
  const { resolveDateWindow } = await import("@/lib/dates");
  const dateWindow = resolveDateWindow({
    preset: datePreset,
    startDate: opts?.startDate ?? undefined,
    endDate: opts?.endDate ?? opts?.startDate ?? undefined,
    locale,
  });

  const from = await resolveEndpoint(
    fromQuery,
    opts?.fromLat != null && opts?.fromLon != null
      ? { lat: opts.fromLat, lon: opts.fromLon }
      : undefined,
    opts?.fromId,
  );
  const to = await resolveEndpoint(
    toQuery,
    opts?.toLat != null && opts?.toLon != null
      ? { lat: opts.toLat, lon: opts.toLon }
      : undefined,
    opts?.toId,
  );

  let candidates: MapboxRoute[] = [];
  let directionsCode = "";
  try {
    // Always request alternatives so we can compare / overlay on the map.
    const result = await getMapboxRoutes(from, to, mode, { alternatives: true });
    candidates = result.routes;
    directionsCode = result.code;
  } catch (error) {
    log.warn({ err: error }, `[route] Mapbox directions (${mode}) failed`);
  }

  const isUnreachable =
    candidates.length === 0 &&
    (directionsCode === "NoRoute" || directionsCode === "NoSegment");
  const routingStatus = isUnreachable
    ? ("unreachable" as const)
    : candidates.length > 0
      ? ("routed" as const)
      : undefined;

  let routed: MapboxRoute | null = candidates[0] ?? null;
  const alternativesCompared = candidates.length;
  let weatherRouteSelected = false;
  let minutesVsFastest: number | null = null;
  let alternativeSummaries: RouteAlternativeDto[] = [];

  if (candidates.length > 0) {
    type SamplePoint = { lat: number; lon: number; t: number; routeIdx: number };
    const allPoints: SamplePoint[] = [];
    const routeMeta = candidates.map((route, routeIdx) => {
      const durationMinutes = durationMinutesFromSeconds(route.durationSeconds);
      const durationHours = durationMinutes / 60;
      const fractions = compareFractions(durationHours, route.distanceKm);
      const points = pointsAlongRoute(from, to, route.geometry, fractions);
      for (const p of points) {
        allPoints.push({ ...p, routeIdx });
      }
      return { route, durationMinutes, durationHours, points };
    });

    const keyToIndex = new Map<string, number>();
    const weatherPlaces: Array<{ lat: number; lon: number; name: string }> = [];
    for (const p of allPoints) {
      const key = weatherGridKey(p.lat, p.lon);
      if (!keyToIndex.has(key)) {
        keyToIndex.set(key, weatherPlaces.length);
        weatherPlaces.push({
          lat: p.lat,
          lon: p.lon,
          name: `cmp-${weatherPlaces.length + 1}`,
        });
      }
    }

    const forecasts = await fetchWeatherBatch(weatherPlaces, locale);

    const scored: Array<{
      route: MapboxRoute;
      dryness: number;
      avgRainProbability: number;
      durationMinutes: number;
    }> = [];

    for (const meta of routeMeta) {
      const samples: CorridorSample[] = meta.points.map((p, i) => {
        const key = weatherGridKey(p.lat, p.lon);
        const wi = keyToIndex.get(key)!;
        const isStart = i === 0;
        const isEnd = i === meta.points.length - 1;
        return {
          name: isStart ? from.name : isEnd ? to.name : `m${i}`,
          role: isStart ? "start" : isEnd ? "destination" : "midpoint",
          lat: p.lat,
          lon: p.lon,
          t: p.t,
          weather: forecasts[wi] ?? null,
        };
      });
      const best = findBestDeparture(samples, meta.durationHours, {
        earliestHour: opts?.earliestDepartureHour ?? null,
        startDate: dateWindow.startDate,
        endDate: dateWindow.endDate,
        timeZone: samples[0]?.weather?.timezone,
      });
      let rainSum = 0;
      for (const sample of samples) {
        const eta = addHoursToLocalKey(
          best.departureTime,
          sample.t * meta.durationHours,
        );
        const slot = lookupHourly(sample.weather, normalizeHourKey(eta));
        rainSum += slot.precipitationProbability;
      }
      const avgRainProbability =
        samples.length > 0 ? Math.round(rainSum / samples.length) : 0;
      scored.push({
        route: meta.route,
        dryness: best.dryness,
        avgRainProbability,
        durationMinutes: meta.durationMinutes,
      });
    }

    const fastest = [...scored].sort(
      (a, b) => a.durationMinutes - b.durationMinutes,
    )[0]!;

    const manual = scored.find((s) => s.route.alternativeIndex === manualAlt);
    if (manual) {
      routed = manual.route;
      minutesVsFastest =
        manual.durationMinutes > fastest.durationMinutes
          ? manual.durationMinutes - fastest.durationMinutes
          : 0;
      weatherRouteSelected =
        manual.route.alternativeIndex !== fastest.route.alternativeIndex;
    } else {
      routed = fastest.route;
      weatherRouteSelected = false;
      minutesVsFastest = 0;
    }

    const selectedIndex = routed?.alternativeIndex ?? 0;
    const driest = [...scored].sort(
      (a, b) =>
        b.dryness - a.dryness ||
        a.avgRainProbability - b.avgRainProbability ||
        a.durationMinutes - b.durationMinutes,
    )[0]!;
    alternativeSummaries = scored.map((s) => ({
      index: s.route.alternativeIndex,
      distanceKm: s.route.distanceKm,
      durationMinutes: s.durationMinutes,
      durationLabel: formatDurationLabel(s.durationMinutes, t),
      dryness: s.dryness,
      avgRainProbability: s.avgRainProbability,
      selected: s.route.alternativeIndex === selectedIndex,
      isFastest: s.route.alternativeIndex === fastest.route.alternativeIndex,
      isDriest: s.route.alternativeIndex === driest.route.alternativeIndex,
      geometry: s.route.geometry,
    }));
  }

  const distanceKm = routed?.distanceKm ?? haversineKm(from, to);
  const durationSeconds = isUnreachable
    ? 0
    : (routed?.durationSeconds ?? fallbackDurationSeconds(distanceKm, mode));
  // One rounded minute value for both the label and waypoint ETAs.
  const durationMinutes = durationMinutesFromSeconds(durationSeconds);
  const durationHours = durationMinutes / 60;
  const durationLabel = isUnreachable
    ? t("routes.durationUnavailable")
    : formatDurationLabel(durationMinutes, t);

  // Unreachable: endpoints only — no interpolated midpoints that look like a corridor.
  const fractions = isUnreachable
    ? [0, 1]
    : sampleFractions(durationHours, distanceKm);
  const points = pointsAlongRoute(
    from,
    to,
    isUnreachable ? undefined : routed?.geometry,
    fractions,
  );

  const reservedNames = new Set(
    [from.name, to.name].map((n) => n.toLowerCase().trim()).filter(Boolean),
  );

  const midNames: string[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    if (i === 0) {
      midNames.push(from.name);
      continue;
    }
    if (i === points.length - 1) {
      midNames.push(to.name);
      continue;
    }
    const fallback =
      points.length === 3
        ? t("routes.roleMidpoint")
        : t("routes.midpointLabel", { n: String(i) });
    const name = await nameMidpoint(p.lat, p.lon, reservedNames, fallback);
    reservedNames.add(name.toLowerCase());
    midNames.push(name);
  }

  const weatherPlaces = points.map((p, i) => ({
    lat: p.lat,
    lon: p.lon,
    name: midNames[i]!,
  }));

  const forecasts = await fetchWeatherBatch(weatherPlaces, locale);

  const samples: CorridorSample[] = points.map((p, i) => {
    const isStart = i === 0;
    const isEnd = i === points.length - 1;
    return {
      name: weatherPlaces[i]!.name,
      role: isStart ? "start" : isEnd ? "destination" : "midpoint",
      lat: p.lat,
      lon: p.lon,
      t: p.t,
      weather: forecasts[i] ?? null,
    };
  });

  const best = findBestDeparture(samples, durationHours, {
    earliestHour: opts?.earliestDepartureHour ?? null,
    startDate: dateWindow.startDate,
    endDate: dateWindow.endDate,
    timeZone: samples[0]?.weather?.timezone,
  });
  const clock = formatClock(best.departureTime, locale);

  const destinationSample =
    samples.find((s) => s.role === "destination") ?? samples[samples.length - 1];
  const destWindowRisk = destinationSample?.weather
    ? windowRainRisk(
        destinationSample.weather.daily,
        dateWindow.startDate,
        dateWindow.endDate,
      )
    : null;
  const windowPeakRainProbability =
    destWindowRisk?.peakRainProbability ?? undefined;

  // Show every corridor sample on the map / timeline (2–5 by trip length).
  const waypoints = samples.map((sample) => {
    const etaKey = addHoursToLocalKey(
      best.departureTime,
      sample.t * durationHours,
    );
    const slot = lookupHourly(sample.weather, normalizeHourKey(etaKey));
    const etaClock = formatClock(etaKey, locale);
    const roleLabel =
      sample.role === "start"
        ? t("routes.roleStart")
        : sample.role === "destination"
          ? t("routes.roleDestination")
          : t("routes.roleMidpoint");

    const etaAdvisories = buildWeatherAdvisories(
      {
        rainProbability: slot.precipitationProbability,
        precipitationMm: slot.precipitationMm,
        condition: slot.condition,
        temperatureC: slot.temperatureC,
        windSpeedKmh: sample.weather?.current.windSpeedKmh,
        placeLabel: sample.name,
      },
      t,
    );

    // Destination: also surface travel-window peak risk (same as destinations page).
    let advisories = etaAdvisories;
    if (sample.role === "destination" && destWindowRisk && sample.weather) {
      const windowAdvisories = buildWeatherAdvisories(
        {
          rainProbability: Math.max(
            destWindowRisk.peakRainProbability,
            slot.precipitationProbability,
          ),
          precipitationMm:
            destWindowRisk.peakDay?.precipitationMm ?? slot.precipitationMm,
          condition:
            destWindowRisk.severeDay?.condition ??
            destWindowRisk.peakDay?.condition ??
            slot.condition,
          temperatureC: slot.temperatureC,
          windSpeedKmh: sample.weather.current.windSpeedKmh,
          placeLabel: sample.name,
        },
        t,
      );
      const byId = new Map(etaAdvisories.map((a) => [a.id, a]));
      for (const a of windowAdvisories) {
        if (!byId.has(a.id) || a.tone === "warning") byId.set(a.id, a);
      }
      advisories = [...byId.values()];
    }

    const tone = toneFromAdvisories(
      Math.max(
        slot.precipitationProbability,
        sample.role === "destination"
          ? (destWindowRisk?.peakRainProbability ?? 0)
          : 0,
      ),
      advisories.some((a) => a.id === "storm" || a.id === "hail")
        ? (destWindowRisk?.severeDay?.condition ?? slot.condition)
        : slot.condition,
      advisories,
    );

    const precipitationMm =
      slot.precipitationMm != null
        ? slot.precipitationMm
        : Math.round((slot.precipitationProbability / 100) * 1.2 * 10) / 10;

    return {
      name: sample.name,
      role: sample.role,
      timeLabel: `${etaClock} • ${roleLabel}`,
      lat: sample.lat,
      lon: sample.lon,
      temperatureC: slot.temperatureC,
      condition: slot.condition,
      rainProbability: slot.precipitationProbability,
      precipitationMm,
      tone,
      advisories,
    };
  });

  const departureHint = isUnreachable
    ? t("routes.unreachableDepartureHint", {
        time: clock,
        mode:
          mode === "cycling"
            ? t("routes.modeCycling")
            : t("routes.modeDriving"),
      })
    : minutesVsFastest != null && minutesVsFastest > 0
      ? t("routes.departureHintWeatherRoute", {
          time: clock,
          from: from.name,
          to: to.name,
          place: best.wettestName,
          rain: String(best.maxRainProbability),
          extra: t("routes.minutesLonger", { m: minutesVsFastest }),
        })
      : t("routes.departureHint", {
          time: clock,
          from: from.name,
          to: to.name,
          place: best.wettestName,
          rain: String(best.maxRainProbability),
        });

  return {
    id: `${from.id}-${to.id}-${mode}`,
    title: t("routes.title", { from: from.name, to: to.name }),
    from,
    to,
    distanceKm: Math.round(distanceKm),
    durationLabel,
    travelMode: mode,
    dryTripGuarantee: best.dryness,
    bestDeparture: clock,
    departureHint,
    geometry: isUnreachable ? undefined : routed?.geometry,
    routingStatus,
    windowPeakRainProbability,
    waypoints,
    prefer: "fast",
    alternativesCompared: isUnreachable ? 0 : alternativesCompared,
    weatherRouteSelected: isUnreachable ? false : weatherRouteSelected,
    minutesVsFastest: isUnreachable ? null : minutesVsFastest,
    alternatives:
      !isUnreachable && alternativeSummaries.length > 1
        ? alternativeSummaries
        : undefined,
  };
}
