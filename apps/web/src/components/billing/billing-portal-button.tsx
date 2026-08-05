"use client";

import { useState } from "react";

type Props = {
  label: string;
  className?: string;
  /** Shown briefly while the portal session is created. */
  pendingLabel?: string;
  errorLabel: string;
};

/**
 * Opens Stripe Customer Portal via full-page navigation.
 * Avoids Server Action `redirect()` to external URLs, which can leave the
 * App Router soft-navigation stuck on "Rendering…" after returning.
 */
export function BillingPortalButton({
  label,
  className,
  pendingLabel,
  errorLabel,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function openPortal() {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        credentials: "same-origin",
      });
      if (!res.ok) {
        setError(true);
        setBusy(false);
        return;
      }
      const data = (await res.json()) as { url?: string };
      if (!data.url) {
        setError(true);
        setBusy(false);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void openPortal()}
        className={className}
      >
        {busy ? (pendingLabel ?? label) : label}
      </button>
      {error ? (
        <p className="mt-2 text-xs text-on-surface-variant" role="alert">
          {errorLabel}
        </p>
      ) : null}
    </div>
  );
}
