"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/components/i18n/locale-provider";

const ALLOWED_APP_SCHEMES = new Set(["solviax:", "solviaxlite:"]);

/**
 * Bridge after Stripe Checkout / Portal when the purchase was started from a
 * native app. Lands on https://…/open-app?to=solviax(lite)://… then hands off.
 */
export default function OpenAppClient() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [failed, setFailed] = useState(false);

  const target = useMemo(() => {
    const raw = searchParams.get("to")?.trim() ?? "";
    try {
      const u = new URL(raw);
      if (!ALLOWED_APP_SCHEMES.has(u.protocol)) return null;
      return u.toString();
    } catch {
      return null;
    }
  }, [searchParams]);

  useEffect(() => {
    if (!target) {
      setFailed(true);
      return;
    }
    const timer = window.setTimeout(() => {
      window.location.href = target;
    }, 150);
    const fallback = window.setTimeout(() => setFailed(true), 2500);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(fallback);
    };
  }, [target]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="text-lg font-semibold text-on-surface">
        {t("mobileOpenApp.title")}
      </p>
      <p className="text-sm text-on-surface-variant">
        {t("mobileOpenApp.body")}
      </p>
      {target ? (
        <a
          href={target}
          className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-on-primary"
        >
          {t("mobileOpenApp.open")}
        </a>
      ) : null}
      {failed ? (
        <Link
          href="/pro"
          className="text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          {t("mobileOpenApp.webFallback")}
        </Link>
      ) : null}
    </main>
  );
}
