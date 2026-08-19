"use client";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

export function getRecaptchaSiteKeyClient(): string {
  return process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() || "";
}

export async function executeRecaptcha(action: string): Promise<string> {
  const siteKey = getRecaptchaSiteKeyClient();
  if (!siteKey) return "";

  const grecaptcha = window.grecaptcha;
  if (!grecaptcha) {
    throw new Error("Recaptcha script not loaded");
  }

  await new Promise<void>((resolve) => {
    grecaptcha.ready(() => resolve());
  });

  return grecaptcha.execute(siteKey, { action });
}
