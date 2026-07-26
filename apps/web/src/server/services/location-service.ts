import "server-only";

import type { PlaceDto, RouteDto, TravelMode } from "@/lib/types";
import { DEFAULT_TRAVEL_MODE } from "@/lib/types";
import { MOCK_ROUTE, findPlace, haversineKm } from "@/server/integrations/mocks/data";
import {
  getMapboxRoute,
  searchPlaces,
} from "@/server/integrations/mapbox";
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
  },
): Promise<RouteDto> {
  const mode = opts?.mode ?? DEFAULT_TRAVEL_MODE;
  const locale = opts?.locale ?? "en";
  const t = createTranslator(getDictionary(locale));
  // TODO: Allow overriding earliestDepartureHour per route on the routes page
  // (query param / UI control), falling back to the Pro settings preference.

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

  let routed: Awaited<ReturnType<typeof getMapboxRoute>> = null;
  try {
    routed = await getMapboxRoute(from, to, mode);
  } catch (error) {
    console.warn(`[route] Mapbox directions (${mode}) failed`, error);
  }

  const distanceKm = routed?.distanceKm ?? haversineKm(from, to);
  const durationSeconds =
    routed?.durationSeconds ?? fallbackDurationSeconds(distanceKm, mode);
  // One rounded minute value for both the label and waypoint ETAs.
  const durationMinutes = durationMinutesFromSeconds(durationSeconds);
  const durationHours = durationMinutes / 60;
  const durationLabel = formatDurationLabel(durationMinutes, t);

  const fractions = sampleFractions(durationHours, distanceKm);
  const points = fractions.map((frac) => {
    if (frac <= 0) return { lat: from.lat, lon: from.lon, t: 0 };
    if (frac >= 1) return { lat: to.lat, lon: to.lon, t: 1 };
    if (routed?.geometry?.length) {
      const p = pointAlong(routed.geometry, frac);
      return { lat: p.lat, lon: p.lon, t: frac };
    }
    return {
      lat: from.lat + (to.lat - from.lat) * frac,
      lon: from.lon + (to.lon - from.lon) * frac,
      t: frac,
    };
  });

  const weatherPlaces = points.map((p, i) => ({
    lat: p.lat,
    lon: p.lon,
    name:
      i === 0
        ? from.name
        : i === points.length - 1
          ? to.name
          : points.length === 3
            ? t("routes.roleMidpoint")
            : t("routes.midpointLabel", { n: String(i) }),
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
  });
  const clock = formatClock(best.departureTime, locale);

  const displaySamples =
    samples.length <= 3
      ? samples
      : [samples[0]!, samples[Math.floor(samples.length / 2)]!, samples[samples.length - 1]!];

  const waypoints = displaySamples.map((sample) => {
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

    return {
      name: sample.name,
      role: sample.role,
      timeLabel: `${etaClock} • ${roleLabel}`,
      lat: sample.lat,
      lon: sample.lon,
      temperatureC: slot.temperatureC,
      condition: slot.condition,
      rainProbability: slot.precipitationProbability,
    };
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
    departureHint: t("routes.departureHint", {
      time: clock,
      from: from.name,
      to: to.name,
      place: best.wettestName,
      rain: String(best.maxRainProbability),
    }),
    geometry: routed?.geometry,
    waypoints,
  };
}
