/** Shared departure-window hour helpers (client + server safe). */
export const DEPARTURE_HOURS = Array.from(
  { length: 24 },
  (_, h) => h,
) as readonly number[];

/** @deprecated Prefer DEPARTURE_HOURS */
export const EARLIEST_DEPARTURE_HOURS = DEPARTURE_HOURS;

export type DepartureWindow = {
  startHour: number | null;
  endHour: number | null;
};

export type NormalizeDepartureWindowResult =
  | { ok: true; window: DepartureWindow }
  | { ok: false; error: "start_after_end" };

export function formatHourOption(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function parseDepartureHourParam(
  raw: string | number | null | undefined,
): number | null {
  if (raw == null || raw === "" || raw === "any") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 23) return null;
  return n;
}

export function normalizeDepartureWindow(
  start: number | null | undefined,
  end: number | null | undefined,
): NormalizeDepartureWindowResult {
  const startHour = parseDepartureHourParam(start ?? null);
  const endHour = parseDepartureHourParam(end ?? null);
  if (startHour != null && endHour != null && startHour > endHour) {
    return { ok: false, error: "start_after_end" };
  }
  return { ok: true, window: { startHour, endHour } };
}

/** Local hour H is allowed when start ≤ H ≤ end (null = unbound on that side). */
export function hourInDepartureWindow(
  h: number,
  startHour: number | null,
  endHour: number | null,
): boolean {
  if (startHour != null && h < startHour) return false;
  if (endHour != null && h > endHour) return false;
  return true;
}
