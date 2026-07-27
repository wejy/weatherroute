import "server-only";

import type { NextRequest } from "next/server";

/**
 * Best-effort client IP for rate limiting / quota.
 * Prefer platform-injected headers over raw X-Forwarded-For (spoofable).
 */
export function getClientIpFromHeaders(h: Headers): string {
  const vercel = h.get("x-vercel-forwarded-for");
  if (vercel) {
    const first = vercel.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = h.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const cf = h.get("cf-connecting-ip")?.trim();
  if (cf) return cf;

  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return "local";
}

export function getClientIp(request: Request | NextRequest): string {
  return getClientIpFromHeaders(request.headers);
}
