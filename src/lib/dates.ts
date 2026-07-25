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

function formatRangeLabel(start: Date, end: Date): string {
  const sameDay = toDateKey(start) === toDateKey(end);
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
  };
  if (sameDay) {
    return start.toLocaleDateString("en-GB", opts);
  }
  return `${start.toLocaleDateString("en-GB", opts)} – ${end.toLocaleDateString("en-GB", opts)}`;
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

export function weekendOptionLabel(now = new Date()): string {
  const dow = now.getDay();
  if (dow === 0 || dow === 6) return "This weekend";
  return "This weekend";
}

export function resolveDateWindow(input: {
  preset: DatePreset;
  startDate?: string;
  endDate?: string;
  now?: Date;
}): DateWindow {
  const now = input.now ?? new Date();
  const today = startOfLocalDay(now);

  if (input.preset === "today") {
    return {
      preset: "today",
      startDate: toDateKey(today),
      endDate: toDateKey(today),
      label: "Today",
      rangeLabel: formatRangeLabel(today, today),
    };
  }

  if (input.preset === "tomorrow") {
    const tom = addDays(today, 1);
    return {
      preset: "tomorrow",
      startDate: toDateKey(tom),
      endDate: toDateKey(tom),
      label: "Tomorrow",
      rangeLabel: formatRangeLabel(tom, tom),
    };
  }

  if (input.preset === "weekend") {
    const { start, end } = getWeekendBounds(now);
    return {
      preset: "weekend",
      startDate: toDateKey(start),
      endDate: toDateKey(end),
      label: weekendOptionLabel(now),
      rangeLabel: formatRangeLabel(start, end),
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
    label: "Custom dates",
    rangeLabel: formatRangeLabel(ordered.start, ordered.end),
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
