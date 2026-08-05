import "server-only";

import { createModuleLogger } from "@/lib/logger";
import { cookies, headers } from "next/headers";
import { and, desc, eq, gt, gte, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { env } from "@/lib/env";
import { rateLimit, peekRateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders } from "@/lib/client-ip";
import { getDb } from "@/db";
import {
  anonymousSessions,
  shareTokens,
  usageEvents,
} from "@/db/schema";
import { USAGE_TYPES } from "@/server/dal/usage-types";
import { routeFingerprint } from "@/lib/route-share";

const log = createModuleLogger("server.dal.quota");
const ANON_COOKIE = "wt_anon";
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;
const IP_QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000;
export const SHARE_TOKEN_LENGTH = 16;

function discoverFingerprint(meta?: Record<string, unknown>): string {
  if (!meta) return "";
  const origin = String(meta.origin ?? "");
  const goal = String(meta.weatherGoal ?? "");
  return `${origin}|${goal}`;
}

/** UTC calendar month [start, nextMonth). */
export function utcMonthWindow(now: Date = new Date()): {
  start: Date;
  next: Date;
} {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  );
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );
  return { start, next };
}

export type QuotaStatus = {
  cookieId?: string;
  searchesUsed: number;
  bonusCredits: number;
  limit: number;
  remaining: number;
  allowed: boolean;
  /** free | anon | pro_monthly | pro_one_time — helps clients label the meter */
  kind?: "anon" | "free" | "pro_monthly" | "pro_one_time";
  /**
   * Why anon discover is blocked. `ip` = shared network day-cap (cookie may still
   * show unused credits — UI must not imply the session meter is exhausted).
   */
  blockReason?: "session" | "ip";
};

/** Client-safe quota (no session identifiers). */
export type PublicQuotaStatus = Omit<QuotaStatus, "cookieId">;

export function toPublicQuota(quota: QuotaStatus | null): PublicQuotaStatus | null {
  if (!quota) return null;
  const { cookieId: _cookieId, ...rest } = quota;
  return rest;
}

async function resolveClientKey(explicit?: string): Promise<string | null> {
  if (explicit?.trim()) return explicit.trim();
  try {
    const h = await headers();
    const device = h.get("x-solviax-device")?.trim();
    if (device) return `device:${device}`;
  } catch {
    // headers() unavailable outside request scope
  }
  return null;
}

/** Prefer real client IP for layered anon anti-abuse. */
async function resolveIpKey(): Promise<string | null> {
  try {
    const h = await headers();
    const ip = getClientIpFromHeaders(h);
    if (!ip || ip === "local") return null;
    return `ip:${ip}`;
  } catch {
    return null;
  }
}

async function ensureAnonSession(): Promise<{
  id: string;
  cookieId: string;
  searchesUsed: number;
  bonusCredits: number;
} | null> {
  const db = getDb();
  if (!db) return null;

  const jar = await cookies();
  let cookieId = jar.get(ANON_COOKIE)?.value;
  if (!cookieId) {
    try {
      const h = await headers();
      cookieId = h.get("x-solviax-anon")?.trim() || undefined;
    } catch {
      // ignore
    }
  }
  if (!cookieId) return null;

  // Reject obviously forged / oversized ids
  if (cookieId.length < 8 || cookieId.length > 80) return null;

  const [existing] = await db
    .select()
    .from(anonymousSessions)
    .where(eq(anonymousSessions.cookieId, cookieId))
    .limit(1);

  if (existing) {
    return {
      id: existing.id,
      cookieId: existing.cookieId,
      searchesUsed: existing.searchesUsed,
      bonusCredits: existing.bonusCredits,
    };
  }

  // Rate-limit new anon session minting per IP (cookie rotation defense).
  const ipKey = await resolveIpKey();
  if (ipKey) {
    const mint = await rateLimit(
      `anon-mint:${ipKey}`,
      env.anonSessionMintLimit,
      IP_QUOTA_WINDOW_MS,
    );
    if (!mint.ok) {
      log.warn({ ipKey }, "[quota] anon session mint rate limited");
      return null;
    }
  }

  const [created] = await db
    .insert(anonymousSessions)
    .values({ cookieId })
    .returning();

  if (!created) return null;
  return {
    id: created.id,
    cookieId: created.cookieId,
    searchesUsed: created.searchesUsed,
    bonusCredits: created.bonusCredits,
  };
}

async function getIpQuotaStatus(clientKey: string): Promise<QuotaStatus> {
  const key = `discover:ip:${clientKey}`;
  const bucket = await peekRateLimit(key, env.anonIpDiscoverLimit, IP_QUOTA_WINDOW_MS);
  const searchesUsed = bucket.count;
  const remaining = Math.max(0, env.anonIpDiscoverLimit - searchesUsed);
  return {
    searchesUsed,
    bonusCredits: 0,
    limit: env.anonIpDiscoverLimit,
    remaining,
    allowed: remaining > 0,
    kind: "anon",
  };
}

async function consumeIpQuota(clientKey: string): Promise<{
  ok: boolean;
  quota: QuotaStatus;
}> {
  const key = `discover:ip:${clientKey}`;
  const bucket = await rateLimit(key, env.anonIpDiscoverLimit, IP_QUOTA_WINDOW_MS);
  const searchesUsed = bucket.count;
  const remaining = Math.max(0, env.anonIpDiscoverLimit - searchesUsed);
  const quota: QuotaStatus = {
    searchesUsed,
    bonusCredits: 0,
    limit: env.anonIpDiscoverLimit,
    remaining,
    allowed: remaining > 0,
    kind: "anon",
  };
  if (!bucket.ok) {
    return {
      ok: false,
      quota: { ...quota, remaining: 0, allowed: false },
    };
  }
  return { ok: true, quota };
}

/** Layer IP cap on top of cookie quota (stops cookie rotation abuse). */
async function peekIpLayer(): Promise<{
  ok: boolean;
  quota: QuotaStatus | null;
}> {
  const ipKey = await resolveIpKey();
  if (!ipKey) return { ok: true, quota: null };
  const status = await getIpQuotaStatus(ipKey);
  return { ok: status.allowed, quota: status };
}

async function consumeIpLayer(): Promise<{
  ok: boolean;
  quota: QuotaStatus | null;
}> {
  const ipKey = await resolveIpKey();
  if (!ipKey) return { ok: true, quota: null };
  const consumed = await consumeIpQuota(ipKey);
  return { ok: consumed.ok, quota: consumed.quota };
}

/** Public meter when the network day-cap is the binding constraint. */
function ipBlockedQuota(
  ipQuota: QuotaStatus | null,
  cookieId?: string,
): QuotaStatus {
  if (ipQuota) {
    return {
      ...ipQuota,
      cookieId,
      remaining: 0,
      allowed: false,
      blockReason: "ip",
    };
  }
  return {
    cookieId,
    searchesUsed: env.anonIpDiscoverLimit,
    bonusCredits: 0,
    limit: env.anonIpDiscoverLimit,
    remaining: 0,
    allowed: false,
    kind: "anon",
    blockReason: "ip",
  };
}

export async function getAnonQuota(
  clientKey?: string,
): Promise<QuotaStatus | null> {
  const session = await ensureAnonSession();
  if (session) {
    const limit = env.anonDiscoverLimit + session.bonusCredits;
    const remaining = Math.max(0, limit - session.searchesUsed);
    const ip = await peekIpLayer();
    if (remaining <= 0) {
      return {
        cookieId: session.cookieId,
        searchesUsed: session.searchesUsed,
        bonusCredits: session.bonusCredits,
        limit,
        remaining: 0,
        allowed: false,
        kind: "anon",
        blockReason: "session",
      };
    }
    if (!ip.ok) {
      return ipBlockedQuota(ip.quota, session.cookieId);
    }
    return {
      cookieId: session.cookieId,
      searchesUsed: session.searchesUsed,
      bonusCredits: session.bonusCredits,
      limit,
      remaining,
      allowed: true,
      kind: "anon",
    };
  }

  const key = (await resolveClientKey(clientKey)) ?? (await resolveIpKey());
  if (!key) return null;
  return getIpQuotaStatus(key);
}

async function countUserDiscoversSince(
  userId: string,
  since: Date,
): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.type, "discover"),
        gte(usageEvents.createdAt, since),
      ),
    );
  return Number(row?.count ?? 0);
}

async function countUserDiscoversThisMonth(userId: string): Promise<number> {
  const { start } = utcMonthWindow();
  return countUserDiscoversSince(userId, start);
}

export async function getUserMonthlyQuota(
  userId: string,
  limit: number,
  kind: "free" | "pro_monthly",
): Promise<QuotaStatus> {
  const searchesUsed = await countUserDiscoversThisMonth(userId);
  const remaining = Math.max(0, limit - searchesUsed);
  return {
    searchesUsed,
    bonusCredits: 0,
    limit,
    remaining,
    allowed: remaining > 0,
    kind,
  };
}

export async function getFreeUserQuota(userId: string): Promise<QuotaStatus> {
  return getUserMonthlyQuota(userId, env.freeMonthlyDiscoverLimit, "free");
}

export async function getProMonthlyQuota(userId: string): Promise<QuotaStatus> {
  return getUserMonthlyQuota(userId, env.proMonthlyDiscoverLimit, "pro_monthly");
}

export async function consumeUserMonthlyDiscover(
  userId: string,
  limit: number,
  kind: "free" | "pro_monthly",
  meta?: Record<string, unknown>,
): Promise<{
  ok: boolean;
  quota: QuotaStatus;
  reason?: "paywall" | "no_db";
}> {
  const db = getDb();
  if (!db) {
    return {
      ok: false,
      reason: "no_db",
      quota: {
        searchesUsed: 0,
        bonusCredits: 0,
        limit,
        remaining: 0,
        allowed: false,
        kind,
      },
    };
  }

  const used = await countUserDiscoversThisMonth(userId);
  if (used >= limit) {
    return {
      ok: false,
      reason: "paywall",
      quota: {
        searchesUsed: used,
        bonusCredits: 0,
        limit,
        remaining: 0,
        allowed: false,
        kind,
      },
    };
  }

  const fp = discoverFingerprint(meta);
  if (fp) {
    const since = new Date(Date.now() - DEDUPE_WINDOW_MS);
    const [recent] = await db
      .select()
      .from(usageEvents)
      .where(
        and(
          eq(usageEvents.userId, userId),
          eq(usageEvents.type, "discover"),
          gt(usageEvents.createdAt, since),
        ),
      )
      .orderBy(desc(usageEvents.createdAt))
      .limit(1);

    const recentMeta = recent?.meta as Record<string, unknown> | null;
    if (recent && discoverFingerprint(recentMeta ?? undefined) === fp) {
      return {
        ok: true,
        quota: {
          searchesUsed: used,
          bonusCredits: 0,
          limit,
          remaining: Math.max(0, limit - used),
          allowed: true,
          kind,
        },
      };
    }
  }

  await db.insert(usageEvents).values({
    userId,
    type: "discover",
    meta: meta ?? null,
  });

  const searchesUsed = used + 1;
  const remaining = Math.max(0, limit - searchesUsed);
  return {
    ok: true,
    quota: {
      searchesUsed,
      bonusCredits: 0,
      limit,
      remaining,
      allowed: remaining > 0,
      kind,
    },
  };
}

export async function consumeFreeUserDiscover(
  userId: string,
  meta?: Record<string, unknown>,
): Promise<{
  ok: boolean;
  quota: QuotaStatus;
  reason?: "paywall" | "no_db";
}> {
  return consumeUserMonthlyDiscover(
    userId,
    env.freeMonthlyDiscoverLimit,
    "free",
    meta,
  );
}

export async function consumeProMonthlyDiscover(
  userId: string,
  meta?: Record<string, unknown>,
): Promise<{
  ok: boolean;
  quota: QuotaStatus;
  reason?: "paywall" | "no_db";
}> {
  return consumeUserMonthlyDiscover(
    userId,
    env.proMonthlyDiscoverLimit,
    "pro_monthly",
    meta,
  );
}

export async function getProOneTimeQuota(
  userId: string,
  windowStart: Date,
): Promise<QuotaStatus> {
  const limit = env.proOneTimeDiscoverLimit;
  const searchesUsed = await countUserDiscoversSince(userId, windowStart);
  const remaining = Math.max(0, limit - searchesUsed);
  return {
    searchesUsed,
    bonusCredits: 0,
    limit,
    remaining,
    allowed: remaining > 0,
    kind: "pro_one_time",
  };
}

export async function consumeProOneTimeDiscover(
  userId: string,
  windowStart: Date,
  meta?: Record<string, unknown>,
): Promise<{
  ok: boolean;
  quota: QuotaStatus;
  reason?: "paywall" | "no_db";
}> {
  const limit = env.proOneTimeDiscoverLimit;
  const kind = "pro_one_time" as const;
  const db = getDb();
  if (!db) {
    return {
      ok: false,
      reason: "no_db",
      quota: {
        searchesUsed: 0,
        bonusCredits: 0,
        limit,
        remaining: 0,
        allowed: false,
        kind,
      },
    };
  }

  const used = await countUserDiscoversSince(userId, windowStart);
  if (used >= limit) {
    return {
      ok: false,
      reason: "paywall",
      quota: {
        searchesUsed: used,
        bonusCredits: 0,
        limit,
        remaining: 0,
        allowed: false,
        kind,
      },
    };
  }

  const fp = discoverFingerprint(meta);
  if (fp) {
    const since = new Date(Date.now() - DEDUPE_WINDOW_MS);
    const [recent] = await db
      .select()
      .from(usageEvents)
      .where(
        and(
          eq(usageEvents.userId, userId),
          eq(usageEvents.type, "discover"),
          gt(usageEvents.createdAt, since),
        ),
      )
      .orderBy(desc(usageEvents.createdAt))
      .limit(1);

    const recentMeta = recent?.meta as Record<string, unknown> | null;
    if (recent && discoverFingerprint(recentMeta ?? undefined) === fp) {
      return {
        ok: true,
        quota: {
          searchesUsed: used,
          bonusCredits: 0,
          limit,
          remaining: Math.max(0, limit - used),
          allowed: true,
          kind,
        },
      };
    }
  }

  await db.insert(usageEvents).values({
    userId,
    type: "discover",
    meta: meta ?? null,
  });

  const searchesUsed = used + 1;
  const remaining = Math.max(0, limit - searchesUsed);
  return {
    ok: true,
    quota: {
      searchesUsed,
      bonusCredits: 0,
      limit,
      remaining,
      allowed: remaining > 0,
      kind,
    },
  };
}

/** Consume one discover credit. Returns quota after consume, or paywall flag. */
export async function consumeDiscoverQuota(
  meta?: Record<string, unknown>,
  opts?: { clientKey?: string },
): Promise<{
  ok: boolean;
  quota: QuotaStatus | null;
  reason?: "paywall" | "no_db" | "no_session";
}> {
  const db = getDb();
  if (!db) {
    return { ok: false, quota: null, reason: "no_session" };
  }

  const session = await ensureAnonSession();
  if (!session) {
    const key =
      (await resolveClientKey(opts?.clientKey)) ?? (await resolveIpKey());
    if (!key) {
      return { ok: false, quota: null, reason: "no_session" };
    }
    const consumed = await consumeIpQuota(key);
    if (!consumed.ok) {
      return {
        ok: false,
        reason: "paywall",
        quota: { ...consumed.quota, blockReason: "ip" },
      };
    }
    return { ok: true, quota: consumed.quota };
  }

  const limit = env.anonDiscoverLimit + session.bonusCredits;
  if (session.searchesUsed >= limit) {
    return {
      ok: false,
      reason: "paywall",
      quota: {
        cookieId: session.cookieId,
        searchesUsed: session.searchesUsed,
        bonusCredits: session.bonusCredits,
        limit,
        remaining: 0,
        allowed: false,
        kind: "anon",
        blockReason: "session",
      },
    };
  }

  // IP layer before spending cookie credit
  const ipPeek = await peekIpLayer();
  if (!ipPeek.ok) {
    return {
      ok: false,
      reason: "paywall",
      quota: ipBlockedQuota(ipPeek.quota, session.cookieId),
    };
  }

  const fp = discoverFingerprint(meta);
  if (fp) {
    const since = new Date(Date.now() - DEDUPE_WINDOW_MS);
    const [recent] = await db
      .select()
      .from(usageEvents)
      .where(
        and(
          eq(usageEvents.anonSessionId, session.id),
          eq(usageEvents.type, "discover"),
          gt(usageEvents.createdAt, since),
        ),
      )
      .orderBy(desc(usageEvents.createdAt))
      .limit(1);

    const recentMeta = recent?.meta as Record<string, unknown> | null;
    if (recent && discoverFingerprint(recentMeta ?? undefined) === fp) {
      return {
        ok: true,
        quota: {
          cookieId: session.cookieId,
          searchesUsed: session.searchesUsed,
          bonusCredits: session.bonusCredits,
          limit,
          remaining: Math.max(0, limit - session.searchesUsed),
          allowed: true,
          kind: "anon",
        },
      };
    }
  }

  const ipConsume = await consumeIpLayer();
  if (!ipConsume.ok) {
    return {
      ok: false,
      reason: "paywall",
      quota: ipBlockedQuota(ipConsume.quota, session.cookieId),
    };
  }

  const [updated] = await db
    .update(anonymousSessions)
    .set({
      searchesUsed: session.searchesUsed + 1,
      updatedAt: new Date(),
    })
    .where(eq(anonymousSessions.id, session.id))
    .returning();

  await db.insert(usageEvents).values({
    anonSessionId: session.id,
    type: "discover",
    meta: meta ?? null,
  });

  const searchesUsed = updated?.searchesUsed ?? session.searchesUsed + 1;
  const bonusCredits = updated?.bonusCredits ?? session.bonusCredits;
  const nextLimit = env.anonDiscoverLimit + bonusCredits;
  const remaining = Math.max(0, nextLimit - searchesUsed);

  return {
    ok: true,
    quota: {
      cookieId: session.cookieId,
      searchesUsed,
      bonusCredits,
      limit: nextLimit,
      remaining,
      allowed: remaining > 0,
      kind: "anon",
    },
  };
}

export async function createShareToken(): Promise<{ token: string } | null> {
  const db = getDb();
  const session = await ensureAnonSession();
  if (!db || !session) return null;

  const token = nanoid(SHARE_TOKEN_LENGTH);
  await db.insert(shareTokens).values({
    token,
    creatorSessionId: session.id,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  return { token };
}

export async function redeemShareToken(token: string): Promise<{
  ok: boolean;
  error?: string;
  quota?: PublicQuotaStatus | null;
}> {
  const db = getDb();
  const session = await ensureAnonSession();
  if (!db || !session) {
    return { ok: false, error: "Database required" };
  }

  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(shareTokens)
        .where(eq(shareTokens.token, token))
        .for("update");

      if (!row || row.expiresAt.getTime() <= Date.now()) {
        return { ok: false, error: "Invalid or expired token" };
      }
      if (row.useCount >= row.maxUses) {
        return { ok: false, error: "Token already used" };
      }
      if (row.creatorSessionId === session.id) {
        return { ok: false, error: "Cannot redeem your own share" };
      }
      if (session.bonusCredits >= env.anonShareBonusCap) {
        return { ok: false, error: "Share bonus cap reached" };
      }

      const [updatedToken] = await tx
        .update(shareTokens)
        .set({
          useCount: row.useCount + 1,
          redeemedBySessionId: session.id,
        })
        .where(
          and(
            eq(shareTokens.id, row.id),
            eq(shareTokens.useCount, row.useCount),
          ),
        )
        .returning();

      if (!updatedToken) {
        return { ok: false, error: "Token already used" };
      }

      const [updatedSession] = await tx
        .update(anonymousSessions)
        .set({
          bonusCredits: session.bonusCredits + 1,
          updatedAt: new Date(),
        })
        .where(eq(anonymousSessions.id, session.id))
        .returning();

      await tx.insert(usageEvents).values({
        anonSessionId: session.id,
        type: "share_redeem",
        meta: { token },
      });

      const bonusCredits =
        updatedSession?.bonusCredits ?? session.bonusCredits + 1;
      const limit = env.anonDiscoverLimit + bonusCredits;
      const remaining = Math.max(0, limit - session.searchesUsed);

      return {
        ok: true,
        quota: toPublicQuota({
          cookieId: session.cookieId,
          searchesUsed: session.searchesUsed,
          bonusCredits,
          limit,
          remaining,
          allowed: remaining > 0,
          kind: "anon",
        }),
      };
    });
  } catch (error) {
    log.error({ err: error }, "[share] redeem failed");
    return { ok: false, error: "Redeem failed" };
  }
}

// --- Route lookup quotas (usage_events.type = route) ---

export { routeFingerprint } from "@/lib/route-share";

async function countEventsSince(opts: {
  type: string;
  userId?: string;
  anonSessionId?: string;
  since: Date;
}): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const clauses = [
    eq(usageEvents.type, opts.type),
    gte(usageEvents.createdAt, opts.since),
  ];
  if (opts.userId) clauses.push(eq(usageEvents.userId, opts.userId));
  if (opts.anonSessionId) {
    clauses.push(eq(usageEvents.anonSessionId, opts.anonSessionId));
  }
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usageEvents)
    .where(and(...clauses));
  return Number(row?.count ?? 0);
}

async function getRouteIpQuotaStatus(clientKey: string): Promise<QuotaStatus> {
  const key = `route:ip:${clientKey}`;
  const bucket = await peekRateLimit(
    key,
    env.anonIpRouteLimit,
    IP_QUOTA_WINDOW_MS,
  );
  const searchesUsed = bucket.count;
  const remaining = Math.max(0, env.anonIpRouteLimit - searchesUsed);
  return {
    searchesUsed,
    bonusCredits: 0,
    limit: env.anonIpRouteLimit,
    remaining,
    allowed: remaining > 0,
    kind: "anon",
  };
}

async function consumeRouteIpQuota(clientKey: string): Promise<{
  ok: boolean;
  quota: QuotaStatus;
}> {
  const key = `route:ip:${clientKey}`;
  const bucket = await rateLimit(
    key,
    env.anonIpRouteLimit,
    IP_QUOTA_WINDOW_MS,
  );
  const searchesUsed = bucket.count;
  const remaining = Math.max(0, env.anonIpRouteLimit - searchesUsed);
  const quota: QuotaStatus = {
    searchesUsed,
    bonusCredits: 0,
    limit: env.anonIpRouteLimit,
    remaining,
    allowed: remaining > 0,
    kind: "anon",
  };
  if (!bucket.ok) {
    return {
      ok: false,
      quota: { ...quota, remaining: 0, allowed: false },
    };
  }
  return { ok: true, quota };
}

async function peekRouteIpLayer(): Promise<{
  ok: boolean;
  quota: QuotaStatus | null;
}> {
  const ipKey = await resolveIpKey();
  if (!ipKey) return { ok: true, quota: null };
  const status = await getRouteIpQuotaStatus(ipKey);
  return { ok: status.allowed, quota: status };
}

async function consumeRouteIpLayer(): Promise<{
  ok: boolean;
  quota: QuotaStatus | null;
}> {
  const ipKey = await resolveIpKey();
  if (!ipKey) return { ok: true, quota: null };
  const consumed = await consumeRouteIpQuota(ipKey);
  return { ok: consumed.ok, quota: consumed.quota };
}

function routeIpBlockedQuota(
  ipQuota: QuotaStatus | null,
  cookieId?: string,
): QuotaStatus {
  if (ipQuota) {
    return {
      ...ipQuota,
      cookieId,
      remaining: 0,
      allowed: false,
      blockReason: "ip",
    };
  }
  return {
    cookieId,
    searchesUsed: env.anonIpRouteLimit,
    bonusCredits: 0,
    limit: env.anonIpRouteLimit,
    remaining: 0,
    allowed: false,
    kind: "anon",
    blockReason: "ip",
  };
}

export async function getAnonRouteQuota(
  clientKey?: string,
): Promise<QuotaStatus | null> {
  const session = await ensureAnonSession();
  const { start } = utcMonthWindow();
  if (session) {
    const limit = env.anonMonthlyRouteLimit;
    const searchesUsed = await countEventsSince({
      type: USAGE_TYPES.route,
      anonSessionId: session.id,
      since: start,
    });
    const remaining = Math.max(0, limit - searchesUsed);
    const ip = await peekRouteIpLayer();
    if (remaining <= 0) {
      return {
        cookieId: session.cookieId,
        searchesUsed,
        bonusCredits: 0,
        limit,
        remaining: 0,
        allowed: false,
        kind: "anon",
        blockReason: "session",
      };
    }
    if (!ip.ok) {
      return routeIpBlockedQuota(ip.quota, session.cookieId);
    }
    return {
      cookieId: session.cookieId,
      searchesUsed,
      bonusCredits: 0,
      limit,
      remaining,
      allowed: true,
      kind: "anon",
    };
  }

  const key = (await resolveClientKey(clientKey)) ?? (await resolveIpKey());
  if (!key) return null;
  return getRouteIpQuotaStatus(key);
}

export async function getUserMonthlyRouteQuota(
  userId: string,
  limit: number,
  kind: "free" | "pro_monthly",
): Promise<QuotaStatus> {
  const { start } = utcMonthWindow();
  const searchesUsed = await countEventsSince({
    type: USAGE_TYPES.route,
    userId,
    since: start,
  });
  const remaining = Math.max(0, limit - searchesUsed);
  return {
    searchesUsed,
    bonusCredits: 0,
    limit,
    remaining,
    allowed: remaining > 0,
    kind,
  };
}

export async function getFreeUserRouteQuota(
  userId: string,
): Promise<QuotaStatus> {
  return getUserMonthlyRouteQuota(userId, env.freeMonthlyRouteLimit, "free");
}

export async function getProMonthlyRouteQuota(
  userId: string,
): Promise<QuotaStatus> {
  return getUserMonthlyRouteQuota(
    userId,
    env.proMonthlyRouteLimit,
    "pro_monthly",
  );
}

export async function consumeUserMonthlyRoute(
  userId: string,
  limit: number,
  kind: "free" | "pro_monthly",
  meta?: Record<string, unknown>,
): Promise<{
  ok: boolean;
  quota: QuotaStatus;
  reason?: "paywall" | "no_db";
}> {
  const db = getDb();
  if (!db) {
    return {
      ok: false,
      reason: "no_db",
      quota: {
        searchesUsed: 0,
        bonusCredits: 0,
        limit,
        remaining: 0,
        allowed: false,
        kind,
      },
    };
  }

  const { start } = utcMonthWindow();
  const used = await countEventsSince({
    type: USAGE_TYPES.route,
    userId,
    since: start,
  });
  if (used >= limit) {
    return {
      ok: false,
      reason: "paywall",
      quota: {
        searchesUsed: used,
        bonusCredits: 0,
        limit,
        remaining: 0,
        allowed: false,
        kind,
      },
    };
  }

  const fp = routeFingerprint(meta);
  if (fp) {
    const since = new Date(Date.now() - DEDUPE_WINDOW_MS);
    const [recent] = await db
      .select()
      .from(usageEvents)
      .where(
        and(
          eq(usageEvents.userId, userId),
          eq(usageEvents.type, USAGE_TYPES.route),
          gt(usageEvents.createdAt, since),
        ),
      )
      .orderBy(desc(usageEvents.createdAt))
      .limit(1);

    const recentMeta = recent?.meta as Record<string, unknown> | null;
    if (recent && routeFingerprint(recentMeta ?? undefined) === fp) {
      return {
        ok: true,
        quota: {
          searchesUsed: used,
          bonusCredits: 0,
          limit,
          remaining: Math.max(0, limit - used),
          allowed: true,
          kind,
        },
      };
    }
  }

  await db.insert(usageEvents).values({
    userId,
    type: USAGE_TYPES.route,
    meta: meta ?? null,
  });

  const searchesUsed = used + 1;
  const remaining = Math.max(0, limit - searchesUsed);
  return {
    ok: true,
    quota: {
      searchesUsed,
      bonusCredits: 0,
      limit,
      remaining,
      allowed: remaining > 0,
      kind,
    },
  };
}

export async function consumeFreeUserRoute(
  userId: string,
  meta?: Record<string, unknown>,
): Promise<{
  ok: boolean;
  quota: QuotaStatus;
  reason?: "paywall" | "no_db";
}> {
  return consumeUserMonthlyRoute(
    userId,
    env.freeMonthlyRouteLimit,
    "free",
    meta,
  );
}

export async function consumeProMonthlyRoute(
  userId: string,
  meta?: Record<string, unknown>,
): Promise<{
  ok: boolean;
  quota: QuotaStatus;
  reason?: "paywall" | "no_db";
}> {
  return consumeUserMonthlyRoute(
    userId,
    env.proMonthlyRouteLimit,
    "pro_monthly",
    meta,
  );
}

/** Consume one anon route credit (monthly session + IP day-cap). */
export async function consumeAnonRouteQuota(
  meta?: Record<string, unknown>,
  opts?: { clientKey?: string },
): Promise<{
  ok: boolean;
  quota: QuotaStatus | null;
  reason?: "paywall" | "no_db" | "no_session";
}> {
  const db = getDb();
  if (!db) {
    return { ok: false, quota: null, reason: "no_session" };
  }

  const session = await ensureAnonSession();
  const { start } = utcMonthWindow();
  if (!session) {
    const key =
      (await resolveClientKey(opts?.clientKey)) ?? (await resolveIpKey());
    if (!key) {
      return { ok: false, quota: null, reason: "no_session" };
    }
    const consumed = await consumeRouteIpQuota(key);
    if (!consumed.ok) {
      return {
        ok: false,
        reason: "paywall",
        quota: { ...consumed.quota, blockReason: "ip" },
      };
    }
    return { ok: true, quota: consumed.quota };
  }

  const limit = env.anonMonthlyRouteLimit;
  const used = await countEventsSince({
    type: USAGE_TYPES.route,
    anonSessionId: session.id,
    since: start,
  });
  if (used >= limit) {
    return {
      ok: false,
      reason: "paywall",
      quota: {
        cookieId: session.cookieId,
        searchesUsed: used,
        bonusCredits: 0,
        limit,
        remaining: 0,
        allowed: false,
        kind: "anon",
        blockReason: "session",
      },
    };
  }

  const ipPeek = await peekRouteIpLayer();
  if (!ipPeek.ok) {
    return {
      ok: false,
      reason: "paywall",
      quota: routeIpBlockedQuota(ipPeek.quota, session.cookieId),
    };
  }

  const fp = routeFingerprint(meta);
  if (fp) {
    const since = new Date(Date.now() - DEDUPE_WINDOW_MS);
    const [recent] = await db
      .select()
      .from(usageEvents)
      .where(
        and(
          eq(usageEvents.anonSessionId, session.id),
          eq(usageEvents.type, USAGE_TYPES.route),
          gt(usageEvents.createdAt, since),
        ),
      )
      .orderBy(desc(usageEvents.createdAt))
      .limit(1);

    const recentMeta = recent?.meta as Record<string, unknown> | null;
    if (recent && routeFingerprint(recentMeta ?? undefined) === fp) {
      return {
        ok: true,
        quota: {
          cookieId: session.cookieId,
          searchesUsed: used,
          bonusCredits: 0,
          limit,
          remaining: Math.max(0, limit - used),
          allowed: true,
          kind: "anon",
        },
      };
    }
  }

  const ipConsume = await consumeRouteIpLayer();
  if (!ipConsume.ok) {
    return {
      ok: false,
      reason: "paywall",
      quota: routeIpBlockedQuota(ipConsume.quota, session.cookieId),
    };
  }

  await db.insert(usageEvents).values({
    anonSessionId: session.id,
    type: USAGE_TYPES.route,
    meta: meta ?? null,
  });

  const searchesUsed = used + 1;
  const remaining = Math.max(0, limit - searchesUsed);
  return {
    ok: true,
    quota: {
      cookieId: session.cookieId,
      searchesUsed,
      bonusCredits: 0,
      limit,
      remaining,
      allowed: remaining > 0,
      kind: "anon",
    },
  };
}
