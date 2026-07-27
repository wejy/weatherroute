import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp } from "@/lib/client-ip";
import { requestEmailOtp } from "@/server/auth/otp";
import { rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limited = await rateLimit(`otp:${ip}`, 10);
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    await requestEmailOtp(parsed.data.email, { clientKey: ip });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[otp]", error);
    const message =
      error instanceof Error && error.message === "Rate limit exceeded"
        ? "Rate limit exceeded"
        : "Failed to send code";
    const status = message === "Rate limit exceeded" ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
