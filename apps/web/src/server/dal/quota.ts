import "server-only";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { env } from "@/lib/env";
import { getDb } from "@/db";
import {
  anonymousSessions,
  shareTokens,
  usageEvents,
} from "@/db/schema";

const ANON_COOKIE = "wt_anon";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type QuotaStatus = {
  cookieId: string;
  searchesUsed: number;
  bonusCredits: number;
  limit: number;
  remaining: number;
  allowed: boolean;
};

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
    cookieId = nanoid(24);
    jar.set(ANON_COOKIE, cookieId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE,
    });
  }

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

export async function getAnonQuota(): Promise<QuotaStatus | null> {
  const session = await ensureAnonSession();
  if (!session) return null;

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

/** Consume one discover credit. Returns quota after consume, or paywall flag. */
export async function consumeDiscoverQuota(meta?: Record<string, unknown>): Promise<{
  ok: boolean;
  quota: QuotaStatus | null;
  reason?: "paywall" | "no_db";
}> {
  const db = getDb();
  if (!db) {
    return { ok: true, quota: null, reason: "no_db" };
  }

  const session = await ensureAnonSession();
  if (!session) {
    return { ok: true, quota: null, reason: "no_db" };
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

  const token = nanoid(16);
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
  quota?: QuotaStatus | null;
}> {
  const db = getDb();
  const session = await ensureAnonSession();
  if (!db || !session) {
    return { ok: false, error: "Database required" };
  }

  const [row] = await db
    .select()
    .from(shareTokens)
    .where(eq(shareTokens.token, token))
    .limit(1);

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

  await db
    .update(shareTokens)
    .set({
      useCount: row.useCount + 1,
      redeemedBySessionId: session.id,
    })
    .where(eq(shareTokens.id, row.id));

  const [updated] = await db
    .update(anonymousSessions)
    .set({
      bonusCredits: session.bonusCredits + 1,
      updatedAt: new Date(),
    })
    .where(eq(anonymousSessions.id, session.id))
    .returning();

  await db.insert(usageEvents).values({
    anonSessionId: session.id,
    type: "share_redeem",
    meta: { token },
  });

  const bonusCredits = updated?.bonusCredits ?? session.bonusCredits + 1;
  const limit = env.anonDiscoverLimit + bonusCredits;
  const remaining = Math.max(0, limit - session.searchesUsed);

  return {
    ok: true,
    quota: {
      cookieId: session.cookieId,
      searchesUsed: session.searchesUsed,
      bonusCredits,
      limit,
      remaining,
      allowed: remaining > 0,
    },
  };
}

/** Soft unlimited for signed-in users until Stripe. */
export function loggedInHasUnlimitedDiscover(): boolean {
  return true;
}
