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
} from "@/lib/types";
import type { DiscoverQuery } from "@/lib/validation/schemas";
import {
  listDateKeys,
  resolveDateWindow,
  type DatePreset,
} from "@/lib/dates";
import { fetchWeather } from "@/server/integrations/weather";
import { reverseGeocode, searchPlaces } from "@/server/integrations/mapbox";
import {
  DESTINATION_CATALOG,
  findPlace,
} from "@/server/integrations/mocks/data";
import {
  citiesWithinRadius,
  placeholderImageFor,
} from "@/server/integrations/places/candidates";
import { fetchNearbySettlements } from "@/server/integrations/places/nearby-overpass";
import {
  resolveRadiusKm,
  candidateLimitForRadius,
} from "@/lib/distance";

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
      return weather.rainProbability * 2 + (weather.condition === "rainy" || weather.condition === "storm" ? 20 : 0);
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

function pickDaysForWindow(
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
  const days = pickDaysForWindow(
    weather.daily,
    window.startDate,
    window.endDate,
  );

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
      sunshineScore: 50,
      cloudCover: weather.current.cloudCover,
    };
  }

  const rainProbability = Math.round(
    days.reduce((s, d) => s + d.precipitationProbability, 0) / days.length,
  );
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
    rainProbability,
    sunshineScore,
    cloudCover,
  };
}

function mergePlaceCandidates(
  curated: Array<PlaceDto & { distanceKm: number }>,
  live: Array<PlaceDto & { distanceKm: number }>,
  limit: number,
): Array<PlaceDto & { distanceKm: number }> {
  const byName = new Map<string, PlaceDto & { distanceKm: number }>();

  // Prefer curated hubs when names collide (stable IDs / catalog images).
  for (const place of [...live, ...curated]) {
    const key = place.name.toLowerCase().trim();
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, place);
      continue;
    }
    const curatedWins =
      !place.id.startsWith("osm-") && existing.id.startsWith("osm-");
    if (curatedWins) {
      byName.set(key, {
        ...place,
        distanceKm: Math.min(place.distanceKm, existing.distanceKm),
      });
      continue;
    }
    if (place.distanceKm < existing.distanceKm) {
      byName.set(key, place);
    }
  }

  return [...byName.values()]
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
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

function emptyDiscoverResult(
  query: DiscoverQuery,
): DiscoverResultDto {
  const dateWindow = resolveDateWindow({
    preset: (query.datePreset ?? "weekend") as DatePreset,
    startDate: query.startDate,
    endDate: query.endDate,
  });
  const distance = (query.distance ?? "region") as DistanceRange;
  const radiusKm = resolveRadiusKm(distance, query.radiusKm);

  return {
    origin: {
      id: "pending",
      name: "Your location",
      placeName: "Detecting location…",
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
): Promise<DiscoverResultDto> {
  const origin = await resolveOrigin(query);
  if (!origin) {
    return emptyDiscoverResult(query);
  }

  const distance = (query.distance ?? "region") as DistanceRange;
  const radiusKm = resolveRadiusKm(distance, query.radiusKm);
  const goal = query.weatherGoal ?? "best";

  const dateWindow = resolveDateWindow({
    preset: (query.datePreset ?? "weekend") as DatePreset,
    startDate: query.startDate,
    endDate: query.endDate,
  });

  const limit = candidateLimitForRadius(radiusKm);
  const curated = citiesWithinRadius(origin, radiusKm, {
    excludeName: origin.name,
    limit,
  });

  // Live OSM settlements around the user (soft-fail; curated catalog always used).
  // Keep Overpass radius modest — large rings time out on public mirrors.
  const overpassRadius = Math.min(radiusKm, 150);
  const live =
    overpassRadius >= 15
      ? await fetchNearbySettlements(origin, overpassRadius, {
          excludeName: origin.name,
          limit: Math.min(Math.max(limit, 24), 36),
        })
      : [];

  const candidates = mergePlaceCandidates(curated, live, limit);

  const catalogById = new Map(DESTINATION_CATALOG.map((d) => [d.id, d]));

  const [originWeatherResult, ...weatherSettled] = await Promise.all([
    fetchWeather({
      lat: origin.lat,
      lon: origin.lon,
      name: origin.placeName,
    }).then(
      (w) => ({ ok: true as const, w }),
      () => ({ ok: false as const }),
    ),
    ...candidates.map(async (city) => {
      try {
        const weather = await fetchWeather({
          lat: city.lat,
          lon: city.lon,
          name: city.placeName,
        });
        return { ok: true as const, city, weather };
      } catch {
        return { ok: false as const, city };
      }
    }),
  ]);

  const destinations: DestinationDto[] = weatherSettled
    .flatMap((result) => {
      if (!result.ok || !("weather" in result)) return [];
      const { city, weather } = result;
      const catalog = catalogById.get(city.id);
      const forecast = summarizePeriod(weather, dateWindow);

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
        sunshineScore: forecast.sunshineScore,
        imageUrl: catalog?.imageUrl ?? placeholderImageFor(city.id),
        description:
          catalog?.description ??
          `${Math.round(city.distanceKm)} km from ${origin.name}`,
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
    .map(({ dest }) => dest);

  const mapMarkers: MapMarkerDto[] = [
    {
      id: `origin-${origin.id}`,
      name: origin.name,
      lat: origin.lat,
      lon: origin.lon,
      temperatureC: originWeatherResult.ok
        ? originWeatherResult.w.current.temperatureC
        : (destinations[0]?.current.temperatureC ?? 18),
      condition: originWeatherResult.ok
        ? originWeatherResult.w.current.condition
        : "partly_cloudy",
    },
    ...destinations.slice(0, 8).map((d) => ({
      id: d.id,
      name: d.name,
      lat: d.lat,
      lon: d.lon,
      temperatureC: d.forecast.tempMaxC,
      condition: d.forecast.condition,
      tomorrowTempC: d.current.temperatureC,
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
    destinations,
    mapMarkers,
    originCurrent: originWeatherResult.ok
      ? {
          temperatureC: originWeatherResult.w.current.temperatureC,
          condition: originWeatherResult.w.current.condition,
          conditionLabel: originWeatherResult.w.current.conditionLabel,
        }
      : undefined,
    originForecast: originWeatherResult.ok
      ? summarizePeriod(originWeatherResult.w, dateWindow)
      : undefined,
  };
}

export async function getWeatherForPlace(input: {
  lat: number;
  lon: number;
  name?: string;
}): Promise<WeatherDto> {
  return fetchWeather(input);
}

export function buildSuitability(
  weather: WeatherDto,
  t?: (key: string, vars?: Record<string, string | number>) => string,
): SuitabilityBadgeDto[] {
  const badges: SuitabilityBadgeDto[] = [];
  const { current, daily } = weather;
  const tr =
    t ??
    ((key: string, vars?: Record<string, string | number>) => {
      const fallback: Record<string, string> = {
        "suitability.outdoorTitle": "Perfect for Outdoor BBQ",
        "suitability.outdoorDesc": "Low wind and clear skies expected.",
        "suitability.photoTitle": "Great for Photography",
        "suitability.photoDesc": "Excellent visibility and soft light.",
        "suitability.wetTitle": "Pack a raincoat",
        "suitability.wetDesc": "{pct}% chance of heavy showers.",
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
      id: "drive",
      tone: "info",
      icon: "directions_car",
      title: tr("suitability.photoTitle"),
      description: tr("suitability.photoDesc"),
    });
  }

  const wetDay = daily.find((d) => d.precipitationProbability >= 50);
  if (wetDay) {
    badges.push({
      id: "umbrella",
      tone: "warning",
      icon: "umbrella",
      title: `${tr("suitability.wetTitle")} · ${wetDay.dayLabel}`,
      description: tr("suitability.wetDesc", {
        pct: wetDay.precipitationProbability,
      }),
    });
  }

  return badges;
}

export async function getDestinationBySlug(slug: string) {
  const fromCatalog = DESTINATION_CATALOG.find(
    (d) => d.slug === slug || d.id === slug,
  );
  if (fromCatalog) return fromCatalog;

  const { WORLD_CITIES } = await import(
    "@/server/integrations/places/candidates"
  );
  const city = WORLD_CITIES.find((c) => c.id === slug);
  if (!city) return undefined;

  return {
    id: city.id,
    slug: city.id,
    name: city.name,
    country: city.country ?? "",
    placeName: city.placeName,
    lat: city.lat,
    lon: city.lon,
    distanceKm: 0,
    temperatureC: 18,
    condition: "partly_cloudy" as const,
    conditionLabel: "Partly cloudy",
    rainProbability: 20,
    sunshineScore: 60,
    imageUrl: placeholderImageFor(city.id),
  };
}
