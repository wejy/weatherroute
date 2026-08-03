export const ADMIN_STATS_MAX_RANGE_DAYS = 366;

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function addUtcDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function parseAdminStatsRange(input: {
  from?: string | null;
  to?: string | null;
  now?: Date;
}): { from: Date; toExclusive: Date; rangeDays: number } {
  const now = input.now ?? new Date();
  const defaultTo = startOfUtcDay(addUtcDays(now, 1));
  const defaultFrom = addUtcDays(defaultTo, -30);

  let from = input.from ? startOfUtcDay(new Date(input.from)) : defaultFrom;
  let toExclusive = input.to
    ? startOfUtcDay(addUtcDays(new Date(input.to), 1))
    : defaultTo;

  if (Number.isNaN(from.getTime())) from = defaultFrom;
  if (Number.isNaN(toExclusive.getTime())) toExclusive = defaultTo;
  if (toExclusive <= from) {
    toExclusive = addUtcDays(from, 1);
  }

  let rangeDays = Math.round(
    (toExclusive.getTime() - from.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (rangeDays > ADMIN_STATS_MAX_RANGE_DAYS) {
    from = addUtcDays(toExclusive, -ADMIN_STATS_MAX_RANGE_DAYS);
    rangeDays = ADMIN_STATS_MAX_RANGE_DAYS;
  }

  return { from, toExclusive, rangeDays };
}

export { addUtcDays, startOfUtcDay };

/** Fill every UTC day in [from, toExclusive) so charts have continuous X axes. */
export function fillDailySeries<T extends Record<string, number>>(
  from: Date,
  toExclusive: Date,
  points: Array<{ day: string } & T>,
  empty: T,
): Array<{ day: string } & T> {
  const byDay = new Map(points.map((p) => [p.day, p]));
  const out: Array<{ day: string } & T> = [];
  for (
    let cursor = startOfUtcDay(from);
    cursor < toExclusive;
    cursor = addUtcDays(cursor, 1)
  ) {
    const day = cursor.toISOString().slice(0, 10);
    const hit = byDay.get(day);
    out.push(hit ? { ...empty, ...hit, day } : { day, ...empty });
  }
  return out;
}
