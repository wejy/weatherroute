import { NextResponse } from "next/server";
import { z } from "zod";
import {
  resolveLocaleFromAcceptLanguage,
  type Locale,
} from "@solviax/i18n";
import { rateLimit } from "@/lib/rate-limit";
import { requestEmailOtp } from "@/server/auth/otp";
import { withApiLog } from "@/lib/api-log";
import { isLocale, LOCALE_COOKIE, defaultLocale } from "@/i18n/config";

const bodySchema = z.object({
  email: z.string().email(),
  locale: z.enum(["en", "fi"]).optional(),
});

function localeFromRequest(request: Request, bodyLocale?: Locale): Locale {
  if (bodyLocale && isLocale(bodyLocale)) return bodyLocale;

  const cookie = request.headers.get("cookie") ?? "";
  const match = new RegExp(
    `(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`,
  ).exec(cookie);
  const fromCookie = match?.[1] ? decodeURIComponent(match[1]) : null;
  if (isLocale(fromCookie)) return fromCookie;

  return resolveLocaleFromAcceptLanguage(
    request.headers.get("accept-language"),
    defaultLocale,
  );
}

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

    const locale = localeFromRequest(request, parsed.data.locale);

    try {
      await requestEmailOtp(parsed.data.email, { clientKey: ip, locale });
      log.info({ email: parsed.data.email, locale }, "otp sent");
    } catch (error) {
      log.error({ err: error }, "otp send failed");
      const message =
        error instanceof Error && error.message === "Rate limit exceeded"
          ? "Rate limit exceeded"
          : "Failed to send code";
      const status = message === "Rate limit exceeded" ? 429 : 500;
      return NextResponse.json({ error: message }, { status });
    }
    return NextResponse.json({ ok: true });
  });
}
