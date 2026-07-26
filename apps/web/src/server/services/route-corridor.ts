import type {
  HourlyForecastDto,
  WeatherCondition,
  WeatherDto,
} from "@/lib/types";

export type CorridorSample = {
  name: string;
  role: "start" | "midpoint" | "destination";
  lat: number;
  lon: number;
  /** Fraction along the trip [0, 1]. */
  t: number;
  weather: WeatherDto | null;
};

export type CorridorScore = {
  departureTime: string;
  dryness: number;
  maxRainProbability: number;
  wettestName: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Normalize Open-Meteo local time to `YYYY-MM-DDTHH:00`. */
export function normalizeHourKey(time: string): string {
  const m = time.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})/);
  if (!m) return time.slice(0, 13);
  return `${m[1]}T${m[2]}:00`;
}

/** Parse `YYYY-MM-DDTHH:MM` (minutes optional) as UTC wall-clock components. */
function parseLocalParts(time: string): {
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
} | null {
  const m = time.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  return {
    y: Number(m[1]),
    mo: Number(m[2]),
    d: Number(m[3]),
    h: Number(m[4]),
    mi: Number(m[5] ?? "0"),
  };
}

/**
 * Add fractional hours to a local wall-clock key (no TZ shift).
 * Preserves minutes so a 19 min trip from 05:00 becomes 05:19.
 * Weather lookup should still use `normalizeHourKey` / `lookupHourly`.
 */
export function addHoursToLocalKey(time: string, hours: number): string {
  const parts = parseLocalParts(time);
  if (!parts) return normalizeHourKey(time);
  const ms =
    Date.UTC(parts.y, parts.mo - 1, parts.d, parts.h, parts.mi) +
    Math.round(hours * 3600 * 1000);
  const next = new Date(ms);
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}T${pad(next.getUTCHours())}:${pad(next.getUTCMinutes())}`;
}

export function hourOfLocalKey(time: string): number {
  const m = normalizeHourKey(time).match(/T(\d{2})/);
  return m ? Number(m[1]) : 12;
}

function dailyFallback(weather: WeatherDto | null, atKey: string): {
  precipitationProbability: number;
  temperatureC: number;
  condition: WeatherCondition;
  conditionLabel: string;
} {
  const date = atKey.slice(0, 10);
  const day =
    weather?.daily.find((d) => d.date === date) ?? weather?.daily[0];
  return {
    precipitationProbability:
      day?.precipitationProbability ??
      weather?.current.precipitationProbability ??
      25,
    temperatureC:
      day != null
        ? Math.round((day.tempMaxC + day.tempMinC) / 2)
        : (weather?.current.temperatureC ?? 15),
    condition: day?.condition ?? weather?.current.condition ?? "cloudy",
    conditionLabel:
      day?.conditionLabel ?? weather?.current.conditionLabel ?? "Cloudy",
  };
}

export function lookupHourly(
  weather: WeatherDto | null,
  atKey: string,
): HourlyForecastDto {
  const key = normalizeHourKey(atKey);
  const hourly = weather?.hourly;
  if (hourly?.length) {
    const exact = hourly.find((h) => normalizeHourKey(h.time) === key);
    if (exact) return exact;
    // Nearest earlier slot
    let best: HourlyForecastDto | undefined;
    for (const h of hourly) {
      if (normalizeHourKey(h.time) <= key) best = h;
      else break;
    }
    if (best) return best;
  }
  const fb = dailyFallback(weather, key);
  return {
    time: key,
    temperatureC: fb.temperatureC,
    precipitationProbability: fb.precipitationProbability,
    cloudCover: weather?.current.cloudCover ?? 40,
    condition: fb.condition,
    conditionLabel: fb.conditionLabel,
  };
}

/**
 * Dryness for a departure: 100 − worst rain probability along the corridor
 * at each sample's ETA.
 */
export function scoreDeparture(
  samples: CorridorSample[],
  departureTime: string,
  durationHours: number,
): CorridorScore {
  let maxRain = 0;
  let wettestName = samples[0]?.name ?? "";

  for (const sample of samples) {
    const eta = addHoursToLocalKey(departureTime, sample.t * durationHours);
    // Hourly forecast is hour-grained; display ETA keeps minutes separately.
    const slot = lookupHourly(sample.weather, normalizeHourKey(eta));
    if (slot.precipitationProbability >= maxRain) {
      maxRain = slot.precipitationProbability;
      wettestName = sample.name;
    }
  }

  return {
    departureTime: normalizeHourKey(departureTime),
    dryness: Math.max(0, Math.min(100, Math.round(100 - maxRain))),
    maxRainProbability: maxRain,
    wettestName,
  };
}

function daytimeBonus(hour: number): number {
  if (hour >= 7 && hour <= 19) return 3;
  if (hour >= 6 && hour <= 21) return 0;
  return -8;
}

/**
 * Pick the driest departure (prefer daytime on ties).
 * Skips past hours, optional earliestHour, and optional date window (YYYY-MM-DD).
 */
export function findBestDeparture(
  samples: CorridorSample[],
  durationHours: number,
  opts?: {
    horizonHours?: number;
    timeZone?: string;
    /** Local hour 0–23; departures before this hour are skipped. */
    earliestHour?: number | null;
    /** Inclusive travel window (local calendar dates). */
    startDate?: string | null;
    endDate?: string | null;
  },
): CorridorScore {
  const timeZone = opts?.timeZone ?? "Europe/Helsinki";
  const earliestHour =
    opts?.earliestHour != null &&
    Number.isInteger(opts.earliestHour) &&
    opts.earliestHour >= 0 &&
    opts.earliestHour <= 23
      ? opts.earliestHour
      : null;
  const startDate = opts?.startDate || null;
  const endDate = opts?.endDate || startDate;

  const originHourly = samples[0]?.weather?.hourly ?? [];
  const nowKey = localNowKey(timeZone);
  const nowHour = normalizeHourKey(nowKey);

  const rawCandidates =
    originHourly.length > 0
      ? originHourly.map((h) => ({ time: h.time }))
      : synthesizeHourlyCandidates(nowKey, 72);

  // When the window extends past hourly coverage, add day-start slots for scoring via daily fallback.
  const windowCandidates = expandWindowCandidates(
    rawCandidates,
    startDate,
    endDate,
    earliestHour ?? 7,
  );

  const horizonHours =
    opts?.horizonHours ??
    (startDate && endDate
      ? Math.max(24, daysBetween(startDate, endDate) * 24)
      : 24);

  const candidates = windowCandidates
    .filter((c) => normalizeHourKey(c.time) >= nowHour)
    .filter(
      (c) =>
        earliestHour == null || hourOfLocalKey(c.time) >= earliestHour,
    )
    .filter((c) => {
      if (!startDate || !endDate) return true;
      const day = normalizeHourKey(c.time).slice(0, 10);
      return day >= startDate && day <= endDate;
    })
    .slice(0, horizonHours);

  let best: CorridorScore | null = null;
  let bestRank = -Infinity;

  for (const c of candidates) {
    const scored = scoreDeparture(samples, c.time, durationHours);
    const hour = hourOfLocalKey(scored.departureTime);
    const rank = scored.dryness * 10 + daytimeBonus(hour);
    if (rank > bestRank) {
      bestRank = rank;
      best = scored;
    }
  }

  return (
    best ??
    scoreDeparture(
      samples,
      candidates[0]?.time ?? nowHour,
      durationHours,
    )
  );
}

function daysBetween(start: string, end: string): number {
  const a = parseLocalParts(`${start}T00:00`);
  const b = parseLocalParts(`${end}T00:00`);
  if (!a || !b) return 1;
  const ms =
    Date.UTC(b.y, b.mo - 1, b.d) - Date.UTC(a.y, a.mo - 1, a.d);
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

function synthesizeHourlyCandidates(
  nowKey: string,
  count: number,
): Array<{ time: string }> {
  const base = parseLocalParts(nowKey) ?? {
    y: new Date().getFullYear(),
    mo: new Date().getMonth() + 1,
    d: new Date().getDate(),
    h: new Date().getHours(),
    mi: 0,
  };
  return Array.from({ length: count }, (_, i) => {
    const ms =
      Date.UTC(base.y, base.mo - 1, base.d, base.h, 0) + i * 3600 * 1000;
    const t = new Date(ms);
    return {
      time: `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T${pad(t.getUTCHours())}:00`,
    };
  });
}

/** Ensure each day in the travel window has at least daytime hour slots. */
function expandWindowCandidates(
  existing: Array<{ time: string }>,
  startDate: string | null,
  endDate: string | null,
  preferredHour: number,
): Array<{ time: string }> {
  if (!startDate || !endDate) return existing;
  const seen = new Set(existing.map((c) => normalizeHourKey(c.time)));
  const out = [...existing];
  const start = parseLocalParts(`${startDate}T00:00`);
  const end = parseLocalParts(`${endDate}T00:00`);
  if (!start || !end) return existing;

  for (
    let ms = Date.UTC(start.y, start.mo - 1, start.d);
    ms <= Date.UTC(end.y, end.mo - 1, end.d);
    ms += 86400000
  ) {
    const day = new Date(ms);
    const y = day.getUTCFullYear();
    const mo = pad(day.getUTCMonth() + 1);
    const d = pad(day.getUTCDate());
    for (const h of [preferredHour, 9, 12, 15, 18]) {
      const key = `${y}-${mo}-${d}T${pad(h)}:00`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ time: key });
      }
    }
  }
  return out;
}

function localNowKey(timeZone: string): string {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(new Date()).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute ?? "00"}`;
}

export function formatClock(timeKey: string, locale: "en" | "fi"): string {
  const parts = parseLocalParts(timeKey);
  if (!parts) return timeKey;
  const d = new Date(
    Date.UTC(parts.y, parts.mo - 1, parts.d, parts.h, parts.mi),
  );
  return d.toLocaleTimeString(locale === "fi" ? "fi-FI" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}
