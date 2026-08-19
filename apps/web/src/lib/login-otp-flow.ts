/** Detect Next.js server-action redirect throws (must not be caught as errors). */
export function isNextRedirectError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("digest" in error)) {
    return false;
  }
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

/** OTP verify step only after a successful send (?sent=1). */
export function shouldShowOtpVerify(initialSent: boolean): boolean {
  return initialSent;
}
