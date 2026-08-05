import "server-only";

import { getCurrentUser } from "@/server/auth/session";
import { resolveUserTier } from "@/server/dal/user-prefs";
import { isAdminUser } from "@/server/dal/roles";
import {
  consumeAnonRouteQuota,
  consumeFreeUserRoute,
  consumeProMonthlyRoute,
  getAnonRouteQuota,
  getFreeUserRouteQuota,
  getProMonthlyRouteQuota,
  toPublicQuota,
  type PublicQuotaStatus,
} from "@/server/dal/quota";

export type RouteGate =
  | { ok: true; paywalled: false; quota: PublicQuotaStatus | null }
  | { ok: false; paywalled: true; quota: PublicQuotaStatus | null };

/**
 * Gate route lookups (Näytä reitti):
 * - admin: unlimited
 * - anon: 30 / UTC month + IP day-cap
 * - free: 50 / UTC month
 * - Pro (one_time + monthly + yearly): 500 / UTC month
 */
export async function gateRouteAccess(opts: {
  consume: boolean;
  meta?: Record<string, unknown>;
  clientKey?: string;
}): Promise<RouteGate> {
  const user = await getCurrentUser();
  if (user) {
    if (await isAdminUser(user.id)) {
      return { ok: true, paywalled: false, quota: null };
    }
    const tier = await resolveUserTier(user.id);
    if (tier === "pro") {
      if (!opts.consume) {
        const quota = await getProMonthlyRouteQuota(user.id);
        if (!quota.allowed) {
          return { ok: false, paywalled: true, quota: toPublicQuota(quota) };
        }
        return { ok: true, paywalled: false, quota: toPublicQuota(quota) };
      }
      const consumed = await consumeProMonthlyRoute(user.id, opts.meta);
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

    if (!opts.consume) {
      const quota = await getFreeUserRouteQuota(user.id);
      if (!quota.allowed) {
        return { ok: false, paywalled: true, quota: toPublicQuota(quota) };
      }
      return { ok: true, paywalled: false, quota: toPublicQuota(quota) };
    }

    const consumed = await consumeFreeUserRoute(user.id, opts.meta);
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
    const quota = await getAnonRouteQuota(opts.clientKey);
    if (quota && !quota.allowed) {
      return { ok: false, paywalled: true, quota: toPublicQuota(quota) };
    }
    return { ok: true, paywalled: false, quota: toPublicQuota(quota) };
  }

  const consumed = await consumeAnonRouteQuota(opts.meta, {
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
    if (consumed.reason === "no_session" || consumed.reason === "no_db") {
      return { ok: false, paywalled: true, quota: null };
    }
  }
  return { ok: true, paywalled: false, quota: toPublicQuota(consumed.quota) };
}
