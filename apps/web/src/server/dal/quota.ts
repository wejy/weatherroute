import "server-only";

import { cookies, headers } from "next/headers";
import { and, desc, eq, gt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { env } from "@/lib/env";
import { rateLimit, peekRateLimit } from "@/lib/rate-limit";
import { getDb } from "@/db";
import {
  anonymousSessions,
  shareTokens,
  usageEvents,
} from "@/db/schema";

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

export type QuotaStatus = {
  cookieId?: string;
  searchesUsed: number;
  bonusCredits: number;
  limit: number;
  remaining: number;
  allowed: boolean;
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
    const device = h.get("x-weathertrip-device")?.trim();
    if (device) return `device:${device}`;
  } catch {
    // headers() unavailable outside request scope
  }
  return null;
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
  const cookieId = jar.get(ANON_COOKIE)?.value;
  if (!cookieId) return null;

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
  };
  if (!bucket.ok) {
    return {
      ok: false,
      quota: { ...quota, remaining: 0, allowed: false },
    };
  }
  return { ok: true, quota };
}

export async function getAnonQuota(
  clientKey?: string,
): Promise<QuotaStatus | null> {
  const session = await ensureAnonSession();
  if (session) {
    const limit = env.anonDiscoverLimit + session.bonusCredits;
    const remaining = Math.max(0, limit - session.searchesUsed);
    return {
      cookieId: session.cookieId,
      searchesUsed: session.searchesUsed,
      bonusCredits: session.bonusCredits,
      limit,
      remaining,
      allowed: remaining > 0,
    };
  }

  const key = await resolveClientKey(clientKey);
  if (!key) return null;
  return getIpQuotaStatus(key);
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
    const key = await resolveClientKey(opts?.clientKey);
    if (!key) {
      return { ok: false, quota: null, reason: "no_session" };
    }
    const consumed = await consumeIpQuota(key);
    if (!consumed.ok) {
      return { ok: false, reason: "paywall", quota: consumed.quota };
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
        },
      };
    }
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
        }),
      };
    });
  } catch (error) {
    console.error("[share] redeem failed", error);
    return { ok: false, error: "Redeem failed" };
  }
}

/** Soft unlimited for signed-in users until Stripe. */
export function loggedInHasUnlimitedDiscover(): boolean {
  return true;
}
