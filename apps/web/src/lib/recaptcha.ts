import "server-only";

const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

export class RecaptchaVerificationError extends Error {
  constructor(message = "Recaptcha verification failed") {
    super(message);
    this.name = "RecaptchaVerificationError";
  }
}

export function getRecaptchaSiteKey(): string {
  return process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() || "";
}

export function getRecaptchaSecretKey(): string {
  return process.env.RECAPTCHA_SECRET_KEY?.trim() || "";
}

/** Both keys set → verify OTP requests from web clients. */
export function isRecaptchaEnabled(): boolean {
  return Boolean(getRecaptchaSiteKey() && getRecaptchaSecretKey());
}

function minScore(): number {
  const raw = Number(process.env.RECAPTCHA_MIN_SCORE ?? "0.5");
  return Number.isFinite(raw) ? raw : 0.5;
}

type SiteVerifyResponse = {
  success?: boolean;
  score?: number;
  action?: string;
  "error-codes"?: string[];
};

/**
 * Verify a reCAPTCHA v3 token. Throws RecaptchaVerificationError on failure.
 * No-op when reCAPTCHA is not configured (local dev without keys).
 */
export async function verifyRecaptchaToken(
  token: string | null | undefined,
  opts?: { remoteIp?: string; expectedAction?: string },
): Promise<void> {
  if (!isRecaptchaEnabled()) return;

  const secret = getRecaptchaSecretKey();
  const trimmed = token?.trim();
  if (!trimmed) {
    throw new RecaptchaVerificationError("Missing recaptcha token");
  }

  const body = new URLSearchParams({
    secret,
    response: trimmed,
  });
  if (opts?.remoteIp) body.set("remoteip", opts.remoteIp);

  const res = await fetch(VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new RecaptchaVerificationError(`Recaptcha HTTP ${res.status}`);
  }

  const data = (await res.json()) as SiteVerifyResponse;
  if (!data.success) {
    throw new RecaptchaVerificationError(
      data["error-codes"]?.join(", ") || "Recaptcha rejected",
    );
  }

  const expectedAction = opts?.expectedAction ?? "request_otp";
  if (data.action && data.action !== expectedAction) {
    throw new RecaptchaVerificationError(
      `Unexpected recaptcha action: ${data.action}`,
    );
  }

  const score = data.score ?? 0;
  if (score < minScore()) {
    throw new RecaptchaVerificationError(`Recaptcha score too low: ${score}`);
  }
}

/** Expo / native clients identify via this header — skip web reCAPTCHA there. */
export function isMobileAppClient(headers: Headers): boolean {
  return Boolean(headers.get("x-solviax-device")?.trim());
}
