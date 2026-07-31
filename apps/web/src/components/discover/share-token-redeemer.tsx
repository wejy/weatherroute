"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/components/i18n/locale-provider";

/**
 * Auto-redeems `?share=` token once, then strips it from the URL.
 */
export function ShareTokenRedeemer() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const ran = useRef(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("share");
    if (!token || ran.current) return;
    ran.current = true;

    void (async () => {
      try {
        const res = await fetch("/api/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "redeem", token }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (res.ok && data.ok) {
          setNote(t("paywall.redeemDone"));
          router.refresh();
        } else {
          setNote(t("paywall.redeemError"));
        }
      } catch {
        setNote(t("paywall.redeemError"));
      } finally {
        const next = new URLSearchParams(searchParams.toString());
        next.delete("share");
        const qs = next.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      }
    })();
  }, [pathname, router, searchParams, t]);

  if (!note) return null;
  return (
    <p
      className="mb-4 rounded-lg bg-primary/10 px-4 py-2 text-center text-sm text-primary"
      role="status"
    >
      {note}
    </p>
  );
}
