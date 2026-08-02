/** Hours of day (0–23) for per-route earliest departure (Pro). */
export const EARLIEST_DEPARTURE_HOURS = Array.from(
  { length: 24 },
  (_, h) => h,
) as readonly number[];

export function formatHourOption(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function parseEarliestHourParam(
  raw: string | number | null | undefined,
): number | null {
  if (raw == null || raw === "" || raw === "any") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 23) return null;
  return n;
}
