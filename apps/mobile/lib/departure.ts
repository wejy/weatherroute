/** Shared earliest-departure hour helpers (client + server safe). */
export const EARLIEST_DEPARTURE_HOURS = Array.from(
  { length: 24 },
  (_, h) => h,
) as readonly number[];

export function formatHourOption(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}
