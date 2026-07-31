import "server-only";

import { getCurrentUser } from "@/server/auth/session";
import {
  consumeDiscoverQuota,
  getAnonQuota,
  loggedInHasUnlimitedDiscover,
  toPublicQuota,
  type PublicQuotaStatus,
} from "@/server/dal/quota";

export type DiscoverGate =
  | { ok: true; paywalled: false; quota: PublicQuotaStatus | null }
  | { ok: false; paywalled: true; quota: PublicQuotaStatus | null };

/**
 * Gate anonymous discover usage.
 * Pass `consume=false` for read-only quota display (e.g. pending origin).
 */
export async function gateDiscoverAccess(opts: {
  consume: boolean;
  meta?: Record<string, unknown>;
  clientKey?: string;
}): Promise<DiscoverGate> {
  const user = await getCurrentUser();
  if (user && loggedInHasUnlimitedDiscover()) {
    return { ok: true, paywalled: false, quota: null };
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
