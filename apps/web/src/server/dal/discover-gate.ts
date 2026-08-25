import "server-only";

import { env } from "@/lib/env";
import { getCurrentUser } from "@/server/auth/session";
import { resolveUserTier } from "@/server/dal/user-prefs";
import { getBillingEntitlement } from "@/server/dal/subscriptions";
import { isAdminUser } from "@/server/dal/roles";
import {
  consumeDiscoverQuota,
  consumeFreeUserDiscover,
  consumeProMonthlyDiscover,
  consumeProOneTimeDiscover,
  getAnonQuota,
  getFreeUserQuota,
  getProMonthlyQuota,
  getProOneTimeQuota,
  toPublicQuota,
  type PublicQuotaStatus,
} from "@/server/dal/quota";

export type DiscoverGate =
  | { ok: true; paywalled: false; quota: PublicQuotaStatus | null }
  | { ok: false; paywalled: true; quota: PublicQuotaStatus | null };

/**
 * Gate discover usage:
 * - admin: unlimited (ops; no quota consume)
 * - anon: cookie + IP
 * - free: 50 / UTC month
 * - Pro monthly: 200 / UTC month (fair-use)
 * - Pro one_time (within 60d): 400 / purchase window (fair-use)
 */
export async function gateDiscoverAccess(opts: {
  consume: boolean;
  meta?: Record<string, unknown>;
  clientKey?: string;
}): Promise<DiscoverGate> {
  const user = await getCurrentUser();
  if (user) {
    if (await isAdminUser(user.id)) {
      return { ok: true, paywalled: false, quota: null };
    }
    const tier = await resolveUserTier(user.id);
    if (tier === "pro") {
      const billing = await getBillingEntitlement(user.id);
      if (billing.plan === "monthly" || billing.plan === "yearly") {
        if (!opts.consume) {
          const quota = await getProMonthlyQuota(user.id);
          if (!quota.allowed) {
            return { ok: false, paywalled: true, quota: toPublicQuota(quota) };
          }
          return { ok: true, paywalled: false, quota: toPublicQuota(quota) };
        }
        const consumed = await consumeProMonthlyDiscover(user.id, opts.meta);
        if (!consumed.ok) {
          return {
            ok: false,
            paywalled: true,
            quota: toPublicQuota(consumed.quota),
          };
        }
        return {
          ok: true,
          paywalled: false,
          quota: toPublicQuota(consumed.quota),
        };
      }

      // one_time Pro — fair-use within the purchase window
      const windowStart = billing.oneTimePaidAt
        ? new Date(billing.oneTimePaidAt)
        : null;
      if (windowStart && !Number.isNaN(windowStart.getTime())) {
        if (!opts.consume) {
          const quota = await getProOneTimeQuota(user.id, windowStart);
          if (!quota.allowed) {
            return { ok: false, paywalled: true, quota: toPublicQuota(quota) };
          }
          return { ok: true, paywalled: false, quota: toPublicQuota(quota) };
        }
        const consumed = await consumeProOneTimeDiscover(
          user.id,
          windowStart,
          opts.meta,
        );
        if (!consumed.ok) {
          return {
            ok: false,
            paywalled: true,
            quota: toPublicQuota(consumed.quota),
          };
        }
        return {
          ok: true,
          paywalled: false,
          quota: toPublicQuota(consumed.quota),
        };
      }
      return { ok: true, paywalled: false, quota: null };
    }

    if (!opts.consume) {
      const quota = await getFreeUserQuota(user.id);
      if (!quota.allowed) {
        return { ok: false, paywalled: true, quota: toPublicQuota(quota) };
      }
      return { ok: true, paywalled: false, quota: toPublicQuota(quota) };
    }

    const consumed = await consumeFreeUserDiscover(user.id, opts.meta);
    if (!consumed.ok) {
      return {
        ok: false,
        paywalled: true,
        quota: toPublicQuota(consumed.quota),
      };
    }
    return { ok: true, paywalled: false, quota: toPublicQuota(consumed.quota) };
  }

  if (!opts.consume) {
    const quota = await getAnonQuota(opts.clientKey);
    if (quota && !quota.allowed) {
      return { ok: false, paywalled: true, quota: toPublicQuota(quota) };
    }
    return { ok: true, paywalled: false, quota: toPublicQuota(quota) };
  }

  const consumed = await consumeDiscoverQuota(opts.meta, {
    clientKey: opts.clientKey,
  });
  if (!consumed.ok) {
    if (consumed.reason === "paywall") {
      return {
        ok: false,
        paywalled: true,
        quota: toPublicQuota(consumed.quota),
      };
    }
    // USE_MOCKS / no DB: quota layer reports no_session|no_db — allow UI smoke.
    if (
      (consumed.reason === "no_db" || consumed.reason === "no_session") &&
      env.useMocks
    ) {
      return { ok: true, paywalled: false, quota: null };
    }
    if (consumed.reason === "no_session" || consumed.reason === "no_db") {
      return { ok: false, paywalled: true, quota: null };
    }
  }
  return { ok: true, paywalled: false, quota: toPublicQuota(consumed.quota) };
}

/** True when the discover query is a real search (has origin coords or name). */
export function isActiveDiscoverQuery(query: {
  origin?: string;
  lat?: number;
  lon?: number;
}): boolean {
  if (query.lat != null && query.lon != null) return true;
  return Boolean(query.origin?.trim());
}
