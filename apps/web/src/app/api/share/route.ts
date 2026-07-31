import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp } from "@/lib/client-ip";
import {
  createShareToken,
  redeemShareToken,
  getAnonQuota,
  SHARE_TOKEN_LENGTH,
  toPublicQuota,
} from "@/server/dal/quota";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const limited = await rateLimit(`share:get:${ip}`, 30);
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const quota = await getAnonQuota(ip);
  return NextResponse.json({ quota: toPublicQuota(quota) });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limited = await rateLimit(`share:${ip}`, 20);
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "create");

  if (action === "create") {
    const created = await createShareToken();
    if (!created) {
      return NextResponse.json({ error: "Database required" }, { status: 503 });
    }
    return NextResponse.json(created);
  }

  if (action === "redeem") {
    const parsed = z
      .object({ token: z.string().min(SHARE_TOKEN_LENGTH).max(32) })
      .safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }
    const result = await redeemShareToken(parsed.data.token);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
