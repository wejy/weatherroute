import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createShareToken, redeemShareToken, getAnonQuota } from "@/server/dal/quota";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const quota = await getAnonQuota();
  return NextResponse.json({ quota });
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const limited = rateLimit(`share:${ip}`, 20);
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
    const parsed = z.object({ token: z.string().min(4) }).safeParse(body);
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
