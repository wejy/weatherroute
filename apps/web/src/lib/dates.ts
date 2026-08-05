export type DatePreset = "today" | "tomorrow" | "weekend" | "custom";

export interface DateWindow {
  preset: DatePreset;
  /** Inclusive YYYY-MM-DD */
  startDate: string;
  /** Inclusive YYYY-MM-DD */
  endDate: string;
  /** Short UI label e.g. "This weekend" */
  label: string;
  /** Longer subtitle e.g. "Sat 26 – Sun 27 Jul" */
  rangeLabel: string;
}

export type DateLocale = "en" | "fi";

/**
 * Weekday short labels indexed by Date#getDay() (0 = Sunday).
 * Finnish uses fixed 2-letter forms (su, ma, …) — never English Sun/Mon.
 */
export const WEEKDAY_SHORT: Record<DateLocale, readonly string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  fi: ["su", "ma", "ti", "ke", "to", "pe", "la"],
};

const DATE_LABELS: Record<
  DateLocale,
  {
    today: string;
    tomorrow: string;
    weekend: string;
    custom: string;
  }
> = {
  en: {
    today: "Today",
    tomorrow: "Tomorrow",
    weekend: "This weekend",
    custom: "Custom dates",
  },
  fi: {
    today: "Tänään",
    tomorrow: "Huomenna",
    weekend: "Tuleva viikonloppu",
    custom: "Omat päivät",
  },
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, day] = key.split("-").map(Number);
  return new Date(y!, m! - 1, day!);
}

/** `YYYY-MM-DD` → locale display date (FI: dd.mm.yyyy, EN: YYYY-MM-DD). */
export function formatDateKeyForLocale(
  key: string,
  locale: DateLocale = "en",
): string {
  if (locale !== "fi") return key;
  const m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return key;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

/** ISO timestamp / date → locale calendar date for billing UI. */
export function formatIsoDateForLocale(
  iso: string | null | undefined,
  locale: DateLocale = "en",
): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return formatDateKeyForLocale(toDateKey(d), locale);
}

/** @deprecated Prefer formatDateKeyForLocale */
export function formatDateKeyDmY(key: string): string {
  return formatDateKeyForLocale(key, "fi");
}

/** Locale-aware weekday abbreviation from a Date or YYYY-MM-DD key. */
export function weekdayShort(
  date: Date | string,
  locale: DateLocale = "en",
): string {
  const d = typeof date === "string" ? parseDateKey(date) : date;
  return WEEKDAY_SHORT[locale][d.getDay()] ?? "";
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfLocalDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatRangeLabel(start: Date, end: Date, locale: DateLocale): string {
  const sameDay = toDateKey(start) === toDateKey(end);
  const tag = locale === "fi" ? "fi-FI" : "en-GB";
  const dayPart = (d: Date) => {
    const wd = weekdayShort(d, locale);
    const rest = d.toLocaleDateString(tag, {
      day: "numeric",
      month: "short",
    });
    return `${wd} ${rest}`;
  };
  if (sameDay) return dayPart(start);
  return `${dayPart(start)} – ${dayPart(end)}`;
}

/** Upcoming / current Sat–Sun based on local day-of-week. */
export function getWeekendBounds(now = new Date()): { start: Date; end: Date } {
  const today = startOfLocalDay(now);
  const dow = today.getDay(); // 0 Sun … 6 Sat

  if (dow === 0) {
    return { start: today, end: today };
  }
  if (dow === 6) {
    return { start: today, end: addDays(today, 1) };
  }
  const daysUntilSat = 6 - dow;
  const sat = addDays(today, daysUntilSat);
  return { start: sat, end: addDays(sat, 1) };
}

export function weekendOptionLabel(
  now = new Date(),
  locale: DateLocale = "en",
): string {
  void now;
  return DATE_LABELS[locale].weekend;
}

export function resolveDateWindow(input: {
  preset: DatePreset;
  startDate?: string;
  endDate?: string;
  now?: Date;
  locale?: DateLocale;
}): DateWindow {
  const now = input.now ?? new Date();
  const today = startOfLocalDay(now);
  const locale = input.locale ?? "en";
  const labels = DATE_LABELS[locale];

  if (input.preset === "today") {
    return {
      preset: "today",
      startDate: toDateKey(today),
      endDate: toDateKey(today),
      label: labels.today,
      rangeLabel: formatRangeLabel(today, today, locale),
    };
  }

  if (input.preset === "tomorrow") {
    const tom = addDays(today, 1);
    return {
      preset: "tomorrow",
      startDate: toDateKey(tom),
      endDate: toDateKey(tom),
      label: labels.tomorrow,
      rangeLabel: formatRangeLabel(tom, tom, locale),
    };
  }

  if (input.preset === "weekend") {
    const { start, end } = getWeekendBounds(now);
    return {
      preset: "weekend",
      startDate: toDateKey(start),
      endDate: toDateKey(end),
      label: labels.weekend,
      rangeLabel: formatRangeLabel(start, end, locale),
    };
  }

  // custom
  const startKey = input.startDate ?? toDateKey(today);
  const endKey = input.endDate ?? startKey;
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  const ordered = start <= end ? { start, end } : { start: end, end: start };

  return {
    preset: "custom",
    startDate: toDateKey(ordered.start),
    endDate: toDateKey(ordered.end),
    label: labels.custom,
    rangeLabel: formatRangeLabel(ordered.start, ordered.end, locale),
  };
}

export function listDateKeys(startDate: string, endDate: string): string[] {
  const keys: string[] = [];
  let cursor = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  while (cursor <= end) {
    keys.push(toDateKey(cursor));
    cursor = addDays(cursor, 1);
  }
  return keys;
}

/** Max selectable custom date (Open-Meteo ~16 day forecast). */
export function maxForecastDateKey(now = new Date()): string {
  return toDateKey(addDays(startOfLocalDay(now), 15));
}

export function minForecastDateKey(now = new Date()): string {
  return toDateKey(startOfLocalDay(now));
}

/** Rewrite daily.dayLabel from ISO dates for the active UI locale. */
export function localizeDayLabels<
  T extends { daily: Array<{ date: string; dayLabel: string }> },
>(weather: T, locale: DateLocale): T {
  return {
    ...weather,
    daily: weather.daily.map((d) => ({
      ...d,
      dayLabel: weekdayShort(d.date, locale),
    })),
  };
}
