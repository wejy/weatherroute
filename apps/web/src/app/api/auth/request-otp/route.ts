import { NextResponse } from "next/server";
import { z } from "zod";
import { requestEmailOtp } from "@/server/auth/otp";
import { rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const limited = rateLimit(`otp:${ip}`, 10);
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    await requestEmailOtp(parsed.data.email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[otp]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send code" },
      { status: 500 },
    );
  }
}
