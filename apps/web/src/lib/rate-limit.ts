import "server-only";

type Bucket = { count: number; resetAt: number };

const memoryBuckets = new Map<string, Bucket>();

const isProduction = process.env.NODE_ENV === "production";

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  consume: boolean,
): { ok: boolean; remaining: number; count: number } {
  const now = Date.now();
  const bucket = memoryBuckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    if (consume) {
      memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return { ok: true, remaining: limit - 1, count: 1 };
    }
    return { ok: true, remaining: limit, count: 0 };
  }

  if (!consume) {
    const remaining = Math.max(0, limit - bucket.count);
    return { ok: bucket.count < limit, remaining, count: bucket.count };
  }

  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, count: bucket.count };
  }

  bucket.count += 1;
  return {
    ok: true,
    remaining: limit - bucket.count,
    count: bucket.count,
  };
}

function denyAll(limit: number): { ok: boolean; remaining: number; count: number } {
  return { ok: false, remaining: 0, count: limit };
}

/** Upstash Redis REST counter (required in production). */
async function upstashRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  consume: boolean,
): Promise<{ ok: boolean; remaining: number; count: number } | null> {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!baseUrl || !token) return null;

  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const redisKey = `rl:${key}`;

  try {
    if (!consume) {
      const res = await fetch(
        `${baseUrl}/get/${encodeURIComponent(redisKey)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(3000),
        },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { result?: string | null };
      const count = Number(data.result ?? 0);
      const safeCount = Number.isFinite(count) ? count : 0;
      const remaining = Math.max(0, limit - safeCount);
      return { ok: safeCount < limit, remaining, count: safeCount };
    }

    const res = await fetch(`${baseUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["TTL", redisKey],
      ]),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { result?: unknown[] };
    const count = Number(data.result?.[0]);
    const ttl = Number(data.result?.[1]);

    if (!Number.isFinite(count) || count < 1) return null;

    if (ttl < 0) {
      await fetch(`${baseUrl}/expire/${encodeURIComponent(redisKey)}/${windowSec}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(3000),
      });
    }

    if (count > limit) {
      return { ok: false, remaining: 0, count };
    }
    return { ok: true, remaining: Math.max(0, limit - count), count };
  } catch {
    return null;
  }
}

export async function rateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000,
  opts?: { consume?: boolean },
): Promise<{ ok: boolean; remaining: number; count: number }> {
  const consume = opts?.consume !== false;
  const distributed = await upstashRateLimit(key, limit, windowMs, consume);
  if (distributed) return distributed;

  // Production: never fall open to process memory (multi-instance / restart bypass).
  if (isProduction) {
    return denyAll(limit);
  }

  return memoryRateLimit(key, limit, windowMs, consume);
}

/** Read current bucket without incrementing. */
export async function peekRateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000,
): Promise<{ ok: boolean; remaining: number; count: number }> {
  return rateLimit(key, limit, windowMs, { consume: false });
}
