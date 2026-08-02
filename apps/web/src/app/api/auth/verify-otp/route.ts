import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { verifyEmailOtp } from "@/server/auth/otp";
import {
  authSessionCookieName,
  encodeAuthSessionToken,
} from "@/server/auth/mobile-session";
import { withApiLog } from "@/lib/api-log";

const bodySchema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(12),
});

export async function POST(request: Request) {
  return withApiLog(request, "auth.verify-otp", async ({ log, ip }) => {
    const limited = await rateLimit(`otp-verify:${ip}`, 20);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    try {
      const user = await verifyEmailOtp(parsed.data.email, parsed.data.code);
      const sessionToken = await encodeAuthSessionToken({
        id: user.userId,
        email: user.email,
        name: user.name,
      });
      const cookieName = authSessionCookieName();

      const res = NextResponse.json({
        ok: true,
        user: {
          id: user.userId,
          email: user.email,
          displayName: user.name || user.email.split("@")[0] || "Traveler",
        },
        sessionToken,
        sessionCookie: cookieName,
      });

      res.cookies.set(cookieName, sessionToken, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30,
      });

      log.info({ userId: user.userId, email: user.email }, "otp verified");
      return res;
    } catch {
      log.info({ email: parsed.data.email }, "otp verify rejected");
      return NextResponse.json(
        { error: "Invalid or expired code" },
        { status: 401 },
      );
    }
  });
}
