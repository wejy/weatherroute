import "server-only";

import type {
  DestinationDto,
  DiscoverResultDto,
  MapMarkerDto,
  SuitabilityBadgeDto,
  WeatherCondition,
  WeatherDto,
  WeatherGoal,
  DistanceRange,
  PlaceDto,
  PeriodWeatherDto,
  DailyForecastDto,
  TravelMode,
} from "@/lib/types";
import { DEFAULT_TRAVEL_MODE } from "@/lib/types";
import type { DiscoverQuery } from "@/lib/validation/schemas";
import {
  listDateKeys,
  resolveDateWindow,
  weekdayShort,
  type DateLocale,
  type DatePreset,
} from "@/lib/dates";
import { fetchWeather, fetchWeatherBatch } from "@/server/integrations/weather";
import { reverseGeocode, searchPlaces } from "@/server/integrations/mapbox";
import {
  DESTINATION_CATALOG,
  findPlace,
} from "@/server/integrations/mocks/data";
import { placeholderImageFor } from "@/server/integrations/places/candidates";
import { buildWeatherAdvisories, rainIntensityFromMm } from "@/lib/weather-advisories";
import { weatherTone } from "@/lib/weather-tone";
import { placesWithinRadius } from "@/server/dal/places";
import { enrichDestinationImages, resolveDestinationImageUrl } from "@/server/services/place-images";
import {
  resolveDiscoverLimits,
  weatherLimitForRadius,
} from "@/server/dal/discover-limits";
import { getEffectiveSameCountryOnly } from "@/server/dal/user-prefs";
import { resolveRadiusKm, clampDistanceForTier, formatDistanceKm } from "@/lib/distance";
import { formatTravelDuration } from "@/lib/utils";

function scoreWeather(
  goal: WeatherGoal,
  weather: {
    temperatureC: number;
    rainProbability: number;
    sunshineScore: number;
    condition: WeatherCondition;
  },
): number {
  switch (goal) {
    case "best":
      // Sunny + warm: sunshine dominates, heat helps, rain hurts lightly.
      return (
        weather.sunshineScore * 1.4 +
        weather.temperatureC * 3.5 -
        weather.rainProbability * 0.35
      );
    case "sun":
      return weather.sunshineScore - weather.rainProbability;
    case "dry":
      return 100 - weather.rainProbability;
    case "mild":
      return 100 - Math.abs(weather.temperatureC - 20) * 5;
    case "rain":
      return (
        weather.rainProbability * 2 +
        (weather.condition === "rainy" ||
        weather.condition === "storm" ||
        weather.condition === "hail" ||
        weather.condition === "freezing_rain"
          ? 20
          : 0)
      );
    case "warm":
      return weather.temperatureC * 3 + weather.sunshineScore / 2;
    case "calm":
      return (
        80 -
        weather.rainProbability +
        (weather.condition === "cloudy" ? 10 : 0)
      );
    case "cloudy":
      return weather.condition === "cloudy" ||
        weather.condition === "partly_cloudy"
        ? 90
        : 40;
    default:
      return weather.sunshineScore;
  }
}

function sunshineFromDay(day: DailyForecastDto): number {
  const clearBoost =
    day.condition === "sunny" ? 30 : day.condition === "partly_cloudy" ? 15 : 0;
  return Math.max(
    0,
    Math.min(
      100,
      100 - day.cloudCover + clearBoost - day.precipitationProbability / 2,
    ),
  );
}

export function pickDaysForWindow(
  daily: DailyForecastDto[],
  startDate: string,
  endDate: string,
): DailyForecastDto[] {
  const keys = new Set(listDateKeys(startDate, endDate));
  let days = daily.filter((d) => keys.has(d.date));

  if (days.length === 0) {
    // Timezone / date-key mismatch — fall back to nearest days by index.
    const startIdx = daily.findIndex((d) => d.date >= startDate);
    const count = Math.max(1, listDateKeys(startDate, endDate).length);
    if (startIdx >= 0) {
      days = daily.slice(startIdx, startIdx + count);
    } else {
      days = daily.slice(0, count);
    }
  }

  return days;
}

/** Peak + average rain risk for a travel window (shared by destinations + routes). */
export function windowRainRisk(
  daily: DailyForecastDto[],
  startDate: string,
  endDate: string,
): {
  days: DailyForecastDto[];
  avgRainProbability: number;
  peakRainProbability: number;
  peakDay: DailyForecastDto | null;
  severeDay: DailyForecastDto | null;
} {
  const days = pickDaysForWindow(daily, startDate, endDate);
  if (days.length === 0) {
    return {
      days,
      avgRainProbability: 0,
      peakRainProbability: 0,
      peakDay: null,
      severeDay: null,
    };
  }
  const peakDay = [...days].sort(
    (a, b) => b.precipitationProbability - a.precipitationProbability,
  )[0]!;
  const severeDay =
    days.find(
      (d) =>
        d.condition === "hail" ||
        d.condition === "storm" ||
        d.condition === "freezing_rain",
    ) ?? null;
  return {
    days,
    avgRainProbability: Math.round(
      days.reduce((s, d) => s + d.precipitationProbability, 0) / days.length,
    ),
    peakRainProbability: peakDay.precipitationProbability,
    peakDay,
    severeDay,
  };
}

export function summarizePeriod(
  weather: WeatherDto,
  window: {
    label: string;
    rangeLabel: string;
    startDate: string;
    endDate: string;
    preset?: string;
  },
): PeriodWeatherDto {
  const risk = windowRainRisk(
    weather.daily,
    window.startDate,
    window.endDate,
  );
  const days = risk.days;

  if (days.length === 0) {
    return {
      label: window.label,
      rangeLabel: window.rangeLabel,
      startDate: window.startDate,
      endDate: window.endDate,
      preset: window.preset,
      temperatureC: weather.current.temperatureC,
      tempMinC: weather.current.temperatureC - 3,
      tempMaxC: weather.current.temperatureC,
      condition: weather.current.condition,
      conditionLabel: weather.current.conditionLabel,
      rainProbability: weather.current.precipitationProbability,
      peakRainProbability: weather.current.precipitationProbability,
      sunshineScore: 50,
      cloudCover: weather.current.cloudCover,
    };
  }

  const precipValues = days
    .map((d) => d.precipitationMm)
    .filter((v): v is number => v != null && Number.isFinite(v));
  const precipitationMm =
    precipValues.length > 0
      ? Math.round(precipValues.reduce((s, v) => s + v, 0) * 10) / 10
      : undefined;
  const cloudCover = Math.round(
    days.reduce((s, d) => s + d.cloudCover, 0) / days.length,
  );
  const tempMaxC = Math.max(...days.map((d) => d.tempMaxC));
  const tempMinC = Math.min(...days.map((d) => d.tempMinC));
  const sunshineScore = Math.round(
    days.reduce((s, d) => s + sunshineFromDay(d), 0) / days.length,
  );

  // Representative condition: sunniest day if goal-agnostic display.
  const representative = [...days].sort(
    (a, b) => sunshineFromDay(b) - sunshineFromDay(a),
  )[0]!;

  return {
    label: window.label,
    rangeLabel: window.rangeLabel,
    startDate: window.startDate,
    endDate: window.endDate,
    preset: window.preset,
    temperatureC: Math.round((tempMaxC + tempMinC) / 2),
    tempMinC: Math.round(tempMinC),
    tempMaxC: Math.round(tempMaxC),
    condition: representative.condition,
    conditionLabel: representative.conditionLabel,
    rainProbability: risk.avgRainProbability,
    peakRainProbability: risk.peakRainProbability,
    precipitationMm,
    sunshineScore,
    cloudCover,
  };
}

async function resolveOrigin(query: DiscoverQuery): Promise<PlaceDto | null> {
  if (query.lat != null && query.lon != null) {
    const name = query.origin?.trim();
    if (name && name.length > 1) {
      return {
        id: `origin-${query.lat.toFixed(3)},${query.lon.toFixed(3)}`,
        name: name.split(",")[0]?.trim() || name,
        placeName: name,
        lat: query.lat,
        lon: query.lon,
      };
    }
    return reverseGeocode(query.lat, query.lon);
  }

  const originText = query.origin?.trim();
  if (!originText) return null;

  const known = findPlace(originText);
  if (known) return known;

  const matches = await searchPlaces(originText, 1);
  return matches[0] ?? null;
}

/** Ensure origin has countryCode when same-country filtering is required. */
async function ensureOriginCountry(origin: PlaceDto): Promise<PlaceDto> {
  if (origin.countryCode) return origin;
  const reversed = await reverseGeocode(origin.lat, origin.lon);
  if (!reversed?.countryCode) return origin;
  return {
    ...origin,
    country: reversed.country ?? origin.country,
    countryCode: reversed.countryCode,
  };
}

function emptyDiscoverResult(
  query: DiscoverQuery,
  locale: DateLocale = "en",
): DiscoverResultDto {
  const dateWindow = resolveDateWindow({
    preset: (query.datePreset ?? "weekend") as DatePreset,
    startDate: query.startDate,
    endDate: query.endDate,
    locale,
  });
  const distance = (query.distance ?? "neighborhood") as DistanceRange;
  const radiusKm = resolveRadiusKm(distance, query.radiusKm);

  return {
    origin: {
      id: "pending",
      name: locale === "fi" ? "Sijaintisi" : "Your location",
      placeName:
        locale === "fi" ? "Paikannetaan…" : "Detecting location…",
      lat: 64.0,
      lon: 26.0,
    },
    weatherGoal: query.weatherGoal ?? "best",
    distance,
    datePreset: dateWindow.preset,
    dateLabel: dateWindow.label,
    dateRangeLabel: dateWindow.rangeLabel,
    startDate: dateWindow.startDate,
    endDate: dateWindow.endDate,
    radiusKm,
    destinations: [],
    mapMarkers: [],
  };
}

export async function discoverDestinations(
  query: DiscoverQuery,
  locale: DateLocale = "en",
): Promise<DiscoverResultDto> {
  let origin = await resolveOrigin(query);
  if (!origin) {
    return emptyDiscoverResult(query, locale);
  }

  const limits = await resolveDiscoverLimits();
  const sameCountry = await getEffectiveSameCountryOnly();
  if (sameCountry.effective) {
    origin = await ensureOriginCountry(origin);
  }

  const clamped = clampDistanceForTier(
    query.distance,
    query.radiusKm,
    limits.tier,
  );
  const distance = clamped.distance as DistanceRange;
  const radiusKm = resolveRadiusKm(distance, clamped.radiusKm);
  const goal = query.weatherGoal ?? "best";
  const travelMode = (query.mode ?? DEFAULT_TRAVEL_MODE) as TravelMode;

  const dateWindow = resolveDateWindow({
    preset: (query.datePreset ?? "weekend") as DatePreset,
    startDate: query.startDate,
    endDate: query.endDate,
    locale,
  });

  const weatherLimit = weatherLimitForRadius(radiusKm, limits.weather);

  const candidates = await placesWithinRadius(origin, radiusKm, {
    excludeName: origin.name,
    limit: weatherLimit,
    countryCode:
      sameCountry.effective && origin.countryCode
        ? origin.countryCode
        : undefined,
  });

  const catalogById = new Map(DESTINATION_CATALOG.map((d) => [d.id, d]));

  const weatherInputs = [
    { lat: origin.lat, lon: origin.lon, name: origin.placeName },
    ...candidates.map((city) => ({
      lat: city.lat,
      lon: city.lon,
      name: city.placeName,
    })),
  ];

  const weatherBatch = await fetchWeatherBatch(weatherInputs, locale);
  const originWeather = weatherBatch[0] ?? null;
  const candidateWeather = weatherBatch.slice(1);

  const seenDestKeys = new Set<string>();
  const destinations: DestinationDto[] = candidates
    .flatMap((city, i) => {
      const weather = candidateWeather[i];
      if (!weather) return [];
      const catalog = catalogById.get(city.id);
      const forecast = summarizePeriod(weather, dateWindow);
      // Always use a multi-day series for sparkline (trip window alone may be 1 day).
      const sparkDays = weather.daily.slice(0, 7);
      const tempSeries = sparkDays.map((d) => Math.round(d.tempMaxC));
      const tempDayLabels = sparkDays.map((d) => weekdayShort(d.date, locale));

      const dest: DestinationDto = {
        id: city.id,
        slug: city.id,
        name: city.name,
        country: city.country ?? catalog?.country ?? "",
        placeName: city.placeName,
        lat: city.lat,
        lon: city.lon,
        distanceKm: city.distanceKm,
        temperatureC: forecast.tempMaxC,
        condition: forecast.condition,
        conditionLabel: forecast.conditionLabel,
        rainProbability: forecast.rainProbability,
        precipitationMm: forecast.precipitationMm,
        sunshineScore: forecast.sunshineScore,
        imageUrl: catalog?.imageUrl ?? placeholderImageFor(city.id),
        description:
          catalog?.description ??
          (locale === "fi"
            ? `${formatDistanceKm(city.distanceKm, "fi")} paikasta ${origin.name}`
            : `${formatDistanceKm(city.distanceKm, "en")} from ${origin.name}`),
        driveDurationLabel: formatTravelDuration(
          city.distanceKm,
          travelMode,
          locale,
        ),
        travelMode,
        tempSeries,
        tempDayLabels,
        current: {
          temperatureC: weather.current.temperatureC,
          condition: weather.current.condition,
          conditionLabel: weather.current.conditionLabel,
          rainProbability: weather.current.precipitationProbability,
        },
        forecast,
      };

      return [
        {
          dest,
          score: scoreWeather(goal, {
            temperatureC: forecast.tempMaxC,
            rainProbability: forecast.rainProbability,
            sunshineScore: forecast.sunshineScore,
            condition: forecast.condition,
          }),
        },
      ];
    })
    .sort((a, b) => b.score - a.score || a.dest.distanceKm - b.dest.distanceKm)
    .flatMap(({ dest }) => {
      const nameKey = dest.name
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .trim();
      const geoKey = `${dest.lat.toFixed(2)},${dest.lon.toFixed(2)}`;
      if (seenDestKeys.has(dest.id) || seenDestKeys.has(nameKey) || seenDestKeys.has(geoKey)) {
        return [];
      }
      seenDestKeys.add(dest.id);
      seenDestKeys.add(nameKey);
      seenDestKeys.add(geoKey);
      return [dest];
    })
    .slice(0, limits.display);

  const destinationsWithImages = await enrichDestinationImages(destinations, {
    locale,
    curatedById: catalogById,
  });

  const mapMarkers: MapMarkerDto[] = [
    {
      id: `origin-${origin.id}`,
      name: origin.name,
      lat: origin.lat,
      lon: origin.lon,
      temperatureC:
        originWeather?.current.temperatureC ??
        destinationsWithImages[0]?.current.temperatureC ??
        18,
      condition: originWeather?.current.condition ?? "partly_cloudy",
    },
    ...destinationsWithImages.map((d) => ({
      id: d.id,
      name: d.name,
      lat: d.lat,
      lon: d.lon,
      temperatureC: d.forecast.tempMaxC,
      condition: d.forecast.condition,
      tomorrowTempC: d.current.temperatureC,
      tempMinC: d.forecast.tempMinC,
      tempMaxC: d.forecast.tempMaxC,
      rainProbability: d.rainProbability,
      precipitationMm: d.precipitationMm,
      sunshineScore: d.sunshineScore,
      dateRangeLabel: d.forecast.rangeLabel,
      conditionLabel: d.forecast.conditionLabel,
      distanceKm: d.distanceKm,
      driveDurationLabel: d.driveDurationLabel,
      travelMode: d.travelMode,
      tempSeries: d.tempSeries,
      tempDayLabels: d.tempDayLabels,
      tone: weatherTone(d.rainProbability, d.condition),
    })),
  ];

  return {
    origin,
    weatherGoal: goal,
    distance,
    datePreset: dateWindow.preset,
    dateLabel: dateWindow.label,
    dateRangeLabel: dateWindow.rangeLabel,
    startDate: dateWindow.startDate,
    endDate: dateWindow.endDate,
    radiusKm,
    destinations: destinationsWithImages,
    mapMarkers,
    originCurrent: originWeather
      ? {
          temperatureC: originWeather.current.temperatureC,
          condition: originWeather.current.condition,
          conditionLabel: originWeather.current.conditionLabel,
        }
      : undefined,
    originForecast: originWeather
      ? summarizePeriod(originWeather, dateWindow)
      : undefined,
  };
}

export async function getWeatherForPlace(input: {
  lat: number;
  lon: number;
  name?: string;
  locale?: DateLocale;
}): Promise<WeatherDto> {
  return fetchWeather(input);
}

export function buildSuitability(
  weather: WeatherDto,
  t?: (key: string, vars?: Record<string, string | number>) => string,
  locale: DateLocale = "en",
  window?: { startDate: string; endDate: string } | null,
): SuitabilityBadgeDto[] {
  const badges: SuitabilityBadgeDto[] = [];
  const { current } = weather;
  const windowDays = window
    ? pickDaysForWindow(weather.daily, window.startDate, window.endDate)
    : weather.daily;
  const daily = windowDays.length > 0 ? windowDays : weather.daily;
  const tr =
    t ??
    ((key: string, vars?: Record<string, string | number>) => {
      const fallback: Record<string, string> = {
        "suitability.outdoorTitle": "Perfect for Outdoor BBQ",
        "suitability.outdoorDesc": "Low wind and clear skies expected.",
        "suitability.photoTitle": "Great for Photography",
        "suitability.photoDesc": "Excellent visibility and soft light.",
        "suitability.kiteTitle": "Good for kite flying",
        "suitability.kiteDesc": "A steady breeze and mild air — ideal for a kite.",
        "suitability.cycleTitle": "Great for a bike ride",
        "suitability.cycleDesc":
          "Dry roads, gentle wind, and a comfortable temperature.",
        "suitability.swimTitle": "Swimming weather",
        "suitability.swimDesc":
          "Warm enough for a dip if you find water nearby.",
        "suitability.wetTitle": "Pack a raincoat",
        "suitability.wetDesc": "{pct}% chance of heavy showers.",
        "advisory.stormTitle": "Thunderstorm risk",
        "advisory.stormDesc": "Expect thunderstorms — delay travel if you can.",
        "advisory.hailTitle": "Hail risk",
        "advisory.hailDesc":
          "Thunderstorm with hail — seek sturdy cover and delay travel if you can.",
        "advisory.freezingRainTitle": "Freezing rain",
        "advisory.freezingRainDesc":
          "Ice may form on roads and paths — allow extra time and drive carefully.",
        "advisory.icingTitle": "Icy / slippery conditions",
        "advisory.icingDesc":
          "Near-freezing temperatures with moisture — watch for slippery surfaces.",
        "advisory.snowTitle": "Snow / icy conditions",
        "advisory.snowDesc": "Snow expected — allow extra travel time.",
        "advisory.fogTitle": "Fog / low visibility",
        "advisory.fogDesc": "Reduced visibility — drive carefully.",
        "advisory.rainTitle": "Heavy rain likely",
        "advisory.rainCautionTitle": "Showers possible",
        "advisory.rainDesc": "{pct}% chance of rain.",
        "advisory.windTitle": "Strong wind",
        "advisory.windCautionTitle": "Windy",
        "advisory.windDesc": "Wind around {speed} km/h.",
        "advisory.heatTitle": "High temperature",
        "advisory.heatDesc": "Around {temp}°C — stay hydrated.",
        "advisory.coldTitle": "Very cold",
        "advisory.coldDesc": "Around {temp}°C — dress warmly.",
      };
      let s = fallback[key] ?? key;
      if (vars) {
        s = s.replace(/\{(\w+)\}/g, (_, k: string) =>
          vars[k] != null ? String(vars[k]) : `{${k}}`,
        );
      }
      return s;
    });

  if (current.precipitationProbability < 20 && current.windSpeedKmh < 20) {
    badges.push({
      id: "bbq",
      tone: "success",
      icon: "outdoor_grill",
      title: tr("suitability.outdoorTitle"),
      description: tr("suitability.outdoorDesc"),
    });
  }

  if (current.visibilityKm >= 8 && current.precipitationProbability < 40) {
    badges.push({
      id: "photo",
      tone: "info",
      icon: "photo_camera",
      title: tr("suitability.photoTitle"),
      description: tr("suitability.photoDesc"),
    });
  }

  const severeSky =
    current.condition === "storm" ||
    current.condition === "hail" ||
    current.condition === "freezing_rain";

  // Steady breeze, mild, mostly dry — kite-friendly without needing a coast.
  if (
    !severeSky &&
    current.windSpeedKmh >= 15 &&
    current.windSpeedKmh <= 35 &&
    current.precipitationProbability < 25 &&
    current.temperatureC >= 8
  ) {
    badges.push({
      id: "kite",
      tone: "success",
      icon: "paragliding",
      title: tr("suitability.kiteTitle"),
      description: tr("suitability.kiteDesc"),
    });
  }

  // Dry, mild, not too windy — good cycling / short outing.
  if (
    !severeSky &&
    current.condition !== "snow" &&
    current.condition !== "fog" &&
    current.precipitationProbability < 20 &&
    current.windSpeedKmh < 25 &&
    current.temperatureC >= 8 &&
    current.temperatureC <= 28
  ) {
    badges.push({
      id: "cycle",
      tone: "success",
      icon: "directions_bike",
      title: tr("suitability.cycleTitle"),
      description: tr("suitability.cycleDesc"),
    });
  }

  // Warm enough for a dip (lake/sea) — no coastal metadata required.
  if (
    !severeSky &&
    current.temperatureC >= 20 &&
    current.precipitationProbability < 30
  ) {
    badges.push({
      id: "swim",
      tone: "success",
      icon: "pool",
      title: tr("suitability.swimTitle"),
      description: tr("suitability.swimDesc"),
    });
  }

  const wetDay = daily.find((d) => d.precipitationProbability >= 50);
  if (wetDay) {
    const day = weekdayShort(wetDay.date, locale);
    const mm = wetDay.precipitationMm;
    const intensity = rainIntensityFromMm(mm);
    const wetDesc =
      intensity === "heavy" && mm != null
        ? tr("suitability.wetDescHeavy", {
            pct: wetDay.precipitationProbability,
            mm: Math.round(mm * 10) / 10,
          })
        : mm != null
          ? tr("suitability.wetDescMm", {
              pct: wetDay.precipitationProbability,
              mm: Math.round(mm * 10) / 10,
            })
          : tr("suitability.wetDesc", {
              pct: wetDay.precipitationProbability,
            });
    badges.push({
      id: "umbrella",
      tone: "warning",
      icon: "umbrella",
      title: `${tr("suitability.wetTitle")} · ${day}`,
      description: wetDesc,
    });
  }

  // Forecast-derived advisories — scoped to the travel window when provided.
  const worstDaily = [...daily].sort(
    (a, b) => b.precipitationProbability - a.precipitationProbability,
  )[0];
  const severeFromWindow =
    daily.find(
      (d) =>
        d.condition === "hail" ||
        d.condition === "storm" ||
        d.condition === "freezing_rain",
    ) ?? null;
  const currentSevere =
    current.condition === "storm" ||
    current.condition === "hail" ||
    current.condition === "freezing_rain" ||
    current.condition === "snow" ||
    current.condition === "fog";
  const advisorySource = {
    rainProbability: Math.max(
      current.precipitationProbability,
      worstDaily?.precipitationProbability ?? 0,
    ),
    precipitationMm: worstDaily?.precipitationMm,
    condition: currentSevere
      ? current.condition
      : (severeFromWindow?.condition ??
        worstDaily?.condition ??
        current.condition),
    temperatureC: current.temperatureC,
    windSpeedKmh: current.windSpeedKmh,
  };
  for (const a of buildWeatherAdvisories(advisorySource, tr)) {
    // Avoid duplicating the wet-day umbrella badge for generic rain.
    if (a.id === "rain" && wetDay) continue;
    if (a.id === "rain-moderate" && wetDay) continue;
    if (a.id === "rain-light" && wetDay) continue;
    if (a.id === "rain-condition" && wetDay) continue;
    badges.push({
      id: a.id,
      tone: a.tone === "warning" ? "warning" : "info",
      icon: a.icon,
      title: a.title,
      description: a.description,
    });
  }

  return badges;
}

export async function getDestinationBySlug(slug: string) {
  const fromCatalog = DESTINATION_CATALOG.find(
    (d) => d.slug === slug || d.id === slug,
  );
  if (fromCatalog) return fromCatalog;

  const { getPlaceById } = await import("@/server/dal/places");
  const { isBlockedPlace } = await import("@/lib/geo-block");
  const place = await getPlaceById(slug);
  if (!place) return undefined;

  if (
    isBlockedPlace({
      country: "country" in place ? place.country : null,
      countryCode: "countryCode" in place ? place.countryCode : null,
      placeName: "placeName" in place ? place.placeName : null,
    })
  ) {
    return undefined;
  }

  const id = "id" in place ? place.id : slug;
  const name = place.name;
  const placeName = "placeName" in place ? place.placeName : name;
  const country =
    ("country" in place && place.country) ||
    ("countryCode" in place && place.countryCode) ||
    "";
  const lat = place.lat;
  const lon = place.lon;

  const imageUrl = await resolveDestinationImageUrl({
    id,
    name,
    placeName,
    lat,
    lon,
  });

  return {
    id,
    slug: id,
    name,
    country,
    placeName,
    lat,
    lon,
    distanceKm: 0,
    temperatureC: 18,
    condition: "partly_cloudy" as const,
    conditionLabel: "Partly cloudy",
    rainProbability: 20,
    sunshineScore: 60,
    imageUrl,
  };
}
