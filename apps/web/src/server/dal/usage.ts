import "server-only";

import { getDb } from "@/db";
import { usageEvents } from "@/db/schema";
import type { UsageEventType } from "@/server/dal/usage-types";

/**
 * Fire-and-forget usage insert. Never throws to callers.
 */
export function recordUsageEvent(input: {
  type: UsageEventType | string;
  userId?: string | null;
  anonSessionId?: string | null;
  meta?: Record<string, unknown> | null;
}): void {
  const db = getDb();
  if (!db) return;

  void db
    .insert(usageEvents)
    .values({
      type: input.type,
      userId: input.userId ?? null,
      anonSessionId: input.anonSessionId ?? null,
      meta: input.meta ?? null,
    })
    .catch(() => {
      /* ignore — usage must not break product requests */
    });
}
