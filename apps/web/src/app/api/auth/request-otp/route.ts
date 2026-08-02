import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { requestEmailOtp } from "@/server/auth/otp";
import { withApiLog } from "@/lib/api-log";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  return withApiLog(request, "auth.request-otp", async ({ log, ip }) => {
    const limited = await rateLimit(`otp:${ip}`, 10);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    try {
      await requestEmailOtp(parsed.data.email, { clientKey: ip });
      log.info({ email: parsed.data.email }, "otp sent");
      return NextResponse.json({ ok: true });
    } catch (error) {
      log.error({ err: error }, "otp send failed");
      const message =
        error instanceof Error && error.message === "Rate limit exceeded"
          ? "Rate limit exceeded"
          : "Failed to send code";
      const status = message === "Rate limit exceeded" ? 429 : 500;
      return NextResponse.json({ error: message }, { status });
    }
  });
}
