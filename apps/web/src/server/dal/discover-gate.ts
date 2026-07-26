import "server-only";

import { getCurrentUser } from "@/server/auth/session";
import {
  consumeDiscoverQuota,
  getAnonQuota,
  loggedInHasUnlimitedDiscover,
  type QuotaStatus,
} from "@/server/dal/quota";

export type DiscoverGate =
  | { ok: true; paywalled: false; quota: QuotaStatus | null }
  | { ok: false; paywalled: true; quota: QuotaStatus | null };

/**
 * Gate anonymous discover usage.
 * Pass `consume=false` for read-only quota display (e.g. pending origin).
 */
export async function gateDiscoverAccess(opts: {
  consume: boolean;
  meta?: Record<string, unknown>;
}): Promise<DiscoverGate> {
  const user = await getCurrentUser();
  if (user && loggedInHasUnlimitedDiscover()) {
    return { ok: true, paywalled: false, quota: null };
  }

  if (!opts.consume) {
    const quota = await getAnonQuota();
    if (quota && !quota.allowed) {
      return { ok: false, paywalled: true, quota };
    }
    return { ok: true, paywalled: false, quota };
  }

  const consumed = await consumeDiscoverQuota(opts.meta);
  if (!consumed.ok && consumed.reason === "paywall") {
    return { ok: false, paywalled: true, quota: consumed.quota };
  }
  return { ok: true, paywalled: false, quota: consumed.quota };
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
