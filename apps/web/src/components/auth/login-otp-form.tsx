"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  requestOtpAction,
  verifyOtpAction,
} from "@/server/actions/trips";
import { useI18n } from "@/components/i18n/locale-provider";

const COOLDOWN_MS = 30_000;
const STORAGE_KEY = "solviax_otp_cooldown";

type CooldownState = { email: string; until: number };

function readCooldown(): CooldownState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CooldownState;
    if (
      typeof parsed?.email !== "string" ||
      typeof parsed?.until !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCooldown(email: string, until: number) {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ email: email.toLowerCase().trim(), until }),
  );
}

function SendSubmitButton({
  disabled,
  label,
  waitLabel,
}: {
  disabled: boolean;
  label: string;
  waitLabel: string;
}) {
  const { pending } = useFormStatus();
  const blocked = disabled || pending;
  return (
    <button
      type="submit"
      disabled={blocked}
      className="w-full rounded-lg bg-primary py-3 font-semibold text-on-primary transition-opacity disabled:cursor-not-allowed disabled:opacity-55"
    >
      {pending ? waitLabel : label}
    </button>
  );
}

function VerifySubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-primary py-3 font-semibold text-on-primary transition-opacity disabled:cursor-not-allowed disabled:opacity-55"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function LoginOtpForm({
  initialEmail,
  initialSent,
  nextParam,
}: {
  initialEmail: string;
  initialSent: boolean;
  nextParam: string;
}) {
  const { t } = useI18n();
  const [email, setEmail] = useState(initialEmail);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownEmail, setCooldownEmail] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const showVerify = Boolean(initialSent || initialEmail);

  useEffect(() => {
    const normalized = initialEmail.toLowerCase().trim();
    if (!initialSent || !normalized) return;

    const existing = readCooldown();
    if (
      existing &&
      existing.email === normalized &&
      existing.until > Date.now()
    ) {
      setCooldownEmail(existing.email);
      setCooldownUntil(existing.until);
      return;
    }
    const until = Date.now() + COOLDOWN_MS;
    writeCooldown(normalized, until);
    setCooldownEmail(normalized);
    setCooldownUntil(until);
  }, [initialEmail, initialSent]);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);

  const secondsLeft = useMemo(() => {
    if (!cooldownUntil) return 0;
    return Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  }, [cooldownUntil, now]);

  const emailNormalized = email.toLowerCase().trim();
  const sameEmailOnCooldown =
    Boolean(cooldownEmail) &&
    emailNormalized === cooldownEmail &&
    secondsLeft > 0;

  const sendLabel = sameEmailOnCooldown
    ? t("login.sendCodeWait", { seconds: secondsLeft })
    : showVerify
      ? t("login.sendCodeAgain")
      : t("login.sendCode");

  return (
    <div className="space-y-6">
      <form action={requestOtpAction} className="space-y-3">
        <input type="hidden" name="next" value={nextParam} />
        <label className="block text-sm font-medium text-on-surface">
          {t("login.emailLabel")}
          <input
            type="email"
            name="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2.5 text-on-surface"
            placeholder="you@example.com"
          />
        </label>
        <SendSubmitButton
          disabled={sameEmailOnCooldown}
          label={sendLabel}
          waitLabel={t("login.sendingCode")}
        />
        {sameEmailOnCooldown ? (
          <p className="text-xs text-on-surface-variant">
            {t("login.changeEmailHint")}
          </p>
        ) : null}
      </form>

      {showVerify ? (
        <form
          action={verifyOtpAction}
          className="space-y-3 border-t border-outline-variant/20 pt-6"
        >
          <input
            type="hidden"
            name="email"
            value={emailNormalized || initialEmail}
          />
          <input type="hidden" name="next" value={nextParam} />
          <p className="text-sm text-on-surface-variant">
            {t("login.codeSent", {
              email: emailNormalized || initialEmail || "…",
            })}
          </p>
          <label className="block text-sm font-medium text-on-surface">
            {t("login.codeLabel")}
            <input
              type="text"
              name="code"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus={initialSent}
              pattern="[0-9]{6}"
              maxLength={6}
              className="mt-1 w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2.5 tracking-widest text-on-surface"
              placeholder="123456"
            />
          </label>
          <VerifySubmitButton
            label={t("login.verifyCode")}
            pendingLabel={t("login.verifyingCode")}
          />
        </form>
      ) : null}
    </div>
  );
}
