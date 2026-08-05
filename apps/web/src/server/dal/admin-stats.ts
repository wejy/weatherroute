import "server-only";

import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { subscriptions, usageEvents, users } from "@/db/schema";
import {
  estimateAdminFinance,
  readAdminCostConfigFromEnv,
  type FinanceEstimate,
} from "@/server/admin/finance";
import {
  ADMIN_STATS_MAX_RANGE_DAYS,
  addUtcDays,
  fillDailySeries,
  parseAdminStatsRange,
} from "@/server/admin/range";
import { ONE_TIME_VALIDITY_DAYS } from "@/server/billing/plans";
import { USAGE_TYPES } from "@/server/dal/usage-types";

export { ADMIN_STATS_MAX_RANGE_DAYS, parseAdminStatsRange };

export type AdminUserBuckets = {
  total: number;
  admin: number;
  free: number;
  proMonthly: number;
  proYearly: number;
  proOneTime: number;
  inactive: number;
};

export type AdminUsageCounts = {
  discover: number;
  login: number;
  route: number;
  routeSave: number;
  shareRedeem: number;
  extMapboxGeocode: number;
  extMapboxDirections: number;
  extOpenMeteo: number;
  extWikipedia: number;
};

export type AdminDailyPoint = {
  day: string;
  discover: number;
  login: number;
  route: number;
  routeSave: number;
};

export type AdminEngagement = {
  /** All rows in users table */
  registeredTotal: number;
  /** Distinct signed-in users with product activity in range */
  uniqueActive: number;
  /** Active in range and also had product activity before range start */
  returningPrior: number;
  /** Active on ≥2 distinct UTC days within the range */
  returningMultiDay: number;
  /** First-ever product activity falls inside the range */
  newActive: number;
};

export type AdminStatsResult = {
  from: string;
  to: string;
  rangeDays: number;
  users: AdminUserBuckets;
  engagement: AdminEngagement;
  usage: AdminUsageCounts;
  series: AdminDailyPoint[];
  finance: FinanceEstimate;
  costConfig: ReturnType<typeof readAdminCostConfigFromEnv>;
};

const EMPTY_DAILY: Omit<AdminDailyPoint, "day"> = {
  discover: 0,
  login: 0,
  route: 0,
  routeSave: 0,
};

const EMPTY_ENGAGEMENT: AdminEngagement = {
  registeredTotal: 0,
  uniqueActive: 0,
  returningPrior: 0,
  returningMultiDay: 0,
  newActive: 0,
};

/** Product events that count as “user was here” (excludes admin/ext-only). */
const ENGAGEMENT_TYPES = [
  USAGE_TYPES.discover,
  USAGE_TYPES.login,
  USAGE_TYPES.route,
  USAGE_TYPES.routeSave,
] as const;


export async function getAdminStats(opts: {
  from?: string | null;
  to?: string | null;
}): Promise<AdminStatsResult> {
  const { from, toExclusive, rangeDays } = parseAdminStatsRange(opts);
  const db = getDb();
  const emptyUsage: AdminUsageCounts = {
    discover: 0,
    login: 0,
    route: 0,
    routeSave: 0,
    shareRedeem: 0,
    extMapboxGeocode: 0,
    extMapboxDirections: 0,
    extOpenMeteo: 0,
    extWikipedia: 0,
  };
  const emptyUsers: AdminUserBuckets = {
    total: 0,
    admin: 0,
    free: 0,
    proMonthly: 0,
    proYearly: 0,
    proOneTime: 0,
    inactive: 0,
  };

  if (!db) {
    const costConfig = readAdminCostConfigFromEnv();
    const finance = estimateAdminFinance({
      rangeDays,
      config: costConfig,
      external: {
        mapboxGeocode: 0,
        mapboxDirections: 0,
        openMeteo: 0,
        wikipedia: 0,
      },
      paying: { monthlyActive: 0, yearlyActive: 0, oneTimeActive: 0 },
    });
    return {
      from: from.toISOString().slice(0, 10),
      to: addUtcDays(toExclusive, -1).toISOString().slice(0, 10),
      rangeDays,
      users: emptyUsers,
      engagement: EMPTY_ENGAGEMENT,
      usage: emptyUsage,
      series: fillDailySeries(from, toExclusive, [], EMPTY_DAILY),
      finance,
      costConfig,
    };
  }

  const oneTimeCutoff = new Date(
    Date.now() - ONE_TIME_VALIDITY_DAYS * 24 * 60 * 60 * 1000,
  );

  const userRows = await db
    .select({
      role: users.role,
      status: subscriptions.status,
      plan: subscriptions.plan,
      oneTimePaidAt: subscriptions.oneTimePaidAt,
    })
    .from(users)
    .leftJoin(subscriptions, eq(subscriptions.userId, users.id));

  const usersBuckets: AdminUserBuckets = { ...emptyUsers };
  usersBuckets.total = userRows.length;
  for (const row of userRows) {
    if (row.role === "admin") {
      usersBuckets.admin += 1;
      continue;
    }
    const plan = row.plan ?? "none";
    const status = row.status ?? "free";
    const activeStatus =
      status === "active" || status === "trial" || status === "past_due";
    if (activeStatus && plan === "monthly") {
      usersBuckets.proMonthly += 1;
    } else if (activeStatus && plan === "yearly") {
      usersBuckets.proYearly += 1;
    } else if (
      activeStatus &&
      plan === "one_time" &&
      row.oneTimePaidAt &&
      row.oneTimePaidAt >= oneTimeCutoff
    ) {
      usersBuckets.proOneTime += 1;
    } else if (!row.status || status === "free" || plan === "none") {
      usersBuckets.free += 1;
    } else {
      usersBuckets.inactive += 1;
    }
  }

  const usageRows = await db
    .select({
      type: usageEvents.type,
      count: sql<number>`count(*)::int`,
    })
    .from(usageEvents)
    .where(
      and(
        gte(usageEvents.createdAt, from),
        lt(usageEvents.createdAt, toExclusive),
      ),
    )
    .groupBy(usageEvents.type);

  const usage: AdminUsageCounts = { ...emptyUsage };
  for (const row of usageRows) {
    const c = Number(row.count ?? 0);
    switch (row.type) {
      case USAGE_TYPES.discover:
        usage.discover = c;
        break;
      case USAGE_TYPES.login:
        usage.login = c;
        break;
      case USAGE_TYPES.route:
        usage.route = c;
        break;
      case USAGE_TYPES.routeSave:
        usage.routeSave = c;
        break;
      case USAGE_TYPES.shareRedeem:
        usage.shareRedeem = c;
        break;
      case USAGE_TYPES.extMapboxGeocode:
        usage.extMapboxGeocode = c;
        break;
      case USAGE_TYPES.extMapboxDirections:
        usage.extMapboxDirections = c;
        break;
      case USAGE_TYPES.extOpenMeteo:
        usage.extOpenMeteo = c;
        break;
      case USAGE_TYPES.extWikipedia:
        usage.extWikipedia = c;
        break;
      default:
        break;
    }
  }

  const seriesRows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${usageEvents.createdAt} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`,
      type: usageEvents.type,
      count: sql<number>`count(*)::int`,
    })
    .from(usageEvents)
    .where(
      and(
        gte(usageEvents.createdAt, from),
        lt(usageEvents.createdAt, toExclusive),
        inArray(usageEvents.type, [...ENGAGEMENT_TYPES]),
      ),
    )
    .groupBy(
      sql`date_trunc('day', ${usageEvents.createdAt} AT TIME ZONE 'UTC')`,
      usageEvents.type,
    );

  const seriesMap = new Map<string, AdminDailyPoint>();
  for (const row of seriesRows) {
    const day = row.day;
    const point = seriesMap.get(day) ?? { day, ...EMPTY_DAILY };
    const c = Number(row.count);
    if (row.type === USAGE_TYPES.discover) point.discover = c;
    if (row.type === USAGE_TYPES.login) point.login = c;
    if (row.type === USAGE_TYPES.route) point.route = c;
    if (row.type === USAGE_TYPES.routeSave) point.routeSave = c;
    seriesMap.set(day, point);
  }
  const series = fillDailySeries(
    from,
    toExclusive,
    [...seriesMap.values()],
    EMPTY_DAILY,
  );

  const engagementWhereInRange = and(
    gte(usageEvents.createdAt, from),
    lt(usageEvents.createdAt, toExclusive),
    sql`${usageEvents.userId} is not null`,
    inArray(usageEvents.type, [...ENGAGEMENT_TYPES]),
  );

  const [uniqueRow] = await db
    .select({
      count: sql<number>`count(distinct ${usageEvents.userId})::int`,
    })
    .from(usageEvents)
    .where(engagementWhereInRange);

  const multiDayUsers = await db
    .select({
      userId: usageEvents.userId,
    })
    .from(usageEvents)
    .where(engagementWhereInRange)
    .groupBy(usageEvents.userId)
    .having(
      sql`count(distinct date_trunc('day', ${usageEvents.createdAt} at time zone 'UTC')) >= 2`,
    );

  // Serialize dates as ISO strings for raw sql fragments (postgres.js rejects Date in sql``).
  const fromIso = from.toISOString();
  const toIso = toExclusive.toISOString();
  const engagementTypesSql = sql.join(
    ENGAGEMENT_TYPES.map((t) => sql`${t}`),
    sql`, `,
  );

  const [priorRow] = await db
    .select({
      count: sql<number>`count(distinct ${usageEvents.userId})::int`,
    })
    .from(usageEvents)
    .where(
      and(
        engagementWhereInRange,
        sql`exists (
          select 1 from usage_events prior
          where prior.user_id = ${usageEvents.userId}
            and prior.created_at < ${fromIso}::timestamptz
            and prior.type in (${engagementTypesSql})
        )`,
      ),
    );

  const newUsers = await db
    .select({
      userId: usageEvents.userId,
    })
    .from(usageEvents)
    .where(
      and(
        sql`${usageEvents.userId} is not null`,
        inArray(usageEvents.type, [...ENGAGEMENT_TYPES]),
      ),
    )
    .groupBy(usageEvents.userId)
    .having(
      sql`min(${usageEvents.createdAt}) >= ${fromIso}::timestamptz and min(${usageEvents.createdAt}) < ${toIso}::timestamptz`,
    );

  const engagement: AdminEngagement = {
    registeredTotal: usersBuckets.total,
    uniqueActive: Number(uniqueRow?.count ?? 0),
    returningPrior: Number(priorRow?.count ?? 0),
    returningMultiDay: multiDayUsers.length,
    newActive: newUsers.length,
  };

  const costConfig = readAdminCostConfigFromEnv();
  const finance = estimateAdminFinance({
    rangeDays,
    config: costConfig,
    external: {
      mapboxGeocode: usage.extMapboxGeocode,
      mapboxDirections: usage.extMapboxDirections,
      openMeteo: usage.extOpenMeteo,
      wikipedia: usage.extWikipedia,
    },
    paying: {
      monthlyActive: usersBuckets.proMonthly,
      yearlyActive: usersBuckets.proYearly,
      oneTimeActive: usersBuckets.proOneTime,
    },
  });

  return {
    from: from.toISOString().slice(0, 10),
    to: addUtcDays(toExclusive, -1).toISOString().slice(0, 10),
    rangeDays,
    users: usersBuckets,
    engagement,
    usage,
    series,
    finance,
    costConfig,
  };
}
