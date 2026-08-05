"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/locale-provider";

type QuotaView = {
  remaining: number;
  limit: number;
  searchesUsed: number;
  bonusCredits: number;
  kind?: "anon" | "free" | "pro_monthly" | "pro_one_time";
  blockReason?: "session" | "ip";
};

export function SoftPaywall({
  quota,
  initialShareToken,
  surface = "discover",
}: {
  quota: QuotaView | null;
  initialShareToken?: string;
  /** Discover share/redeem vs route monthly caps (no share credits). */
  surface?: "discover" | "route";
}) {
  const { t } = useI18n();
  const router = useRouter();
  const isRoute = surface === "route";
  const isFreeTier = quota?.kind === "free";
  const isProMonthlyCap = quota?.kind === "pro_monthly";
  const isProOneTimeCap = quota?.kind === "pro_one_time";
  const isProFairUseCap = isProMonthlyCap || isProOneTimeCap;
  const isNetworkCap = quota?.blockReason === "ip";
  const [shareBusy, setShareBusy] = useState(false);
  const [redeemToken, setRedeemToken] = useState(initialShareToken ?? "");
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const title = isNetworkCap
    ? t(isRoute ? "paywall.routeTitleNetwork" : "paywall.titleNetwork")
    : isFreeTier
      ? t(isRoute ? "paywall.routeTitleFree" : "paywall.titleFree")
      : isProMonthlyCap || (isRoute && isProFairUseCap)
        ? t(isRoute ? "paywall.routeTitlePro" : "paywall.titleProMonthly")
        : isProOneTimeCap
          ? t("paywall.titleProOneTime")
          : t(isRoute ? "paywall.routeTitle" : "paywall.title");

  const body = isNetworkCap
    ? t(isRoute ? "paywall.routeBodyNetwork" : "paywall.bodyNetwork")
    : isFreeTier
      ? t(isRoute ? "paywall.routeBodyFree" : "paywall.bodyFree")
      : isProMonthlyCap || (isRoute && isProFairUseCap)
        ? t(isRoute ? "paywall.routeBodyPro" : "paywall.bodyProMonthly")
        : isProOneTimeCap
          ? t("paywall.bodyProOneTime")
          : t(isRoute ? "paywall.routeBody" : "paywall.body");

  const createAndShare = useCallback(async () => {
    setShareBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        throw new Error(data.error || "share_failed");
      }
      const url = `${window.location.origin}/?share=${data.token}`;
      if (navigator.share) {
        await navigator.share({
          title: t("brand"),
          text: t("paywall.shareText"),
          url,
        });
        setMessage(t("paywall.shareDone"));
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setMessage(t("paywall.linkCopied"));
      } else {
        setMessage(url);
      }
    } catch {
      setError(t("paywall.shareError"));
    } finally {
      setShareBusy(false);
    }
  }, [t]);

  const redeem = useCallback(async () => {
    const token = redeemToken.trim();
    if (!token) return;
    setRedeemBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "redeem", token }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "redeem_failed");
      }
      setMessage(t("paywall.redeemDone"));
      router.refresh();
    } catch {
      setError(t("paywall.redeemError"));
    } finally {
      setRedeemBusy(false);
    }
  }, [redeemToken, router, t]);

  return (
    <section
      className="mx-auto w-full max-w-xl rounded-[2rem] border border-outline-variant/30 bg-surface/95 p-8 text-center shadow-lg backdrop-blur-xl"
      aria-labelledby="paywall-title"
    >
      <span className="material-symbols-outlined mb-3 text-5xl text-primary">
        lock_open
      </span>
      <h2
        id="paywall-title"
        className="text-2xl font-bold tracking-tight text-on-surface"
      >
        {title}
      </h2>
      <p className="mt-3 text-on-surface-variant">{body}</p>
      {quota ? (
        <p className="mt-2 text-sm text-on-surface-variant">
          {t(
            isNetworkCap
              ? isRoute
                ? "paywall.routeQuotaUsedNetwork"
                : "paywall.quotaUsedNetwork"
              : isRoute
                ? "paywall.routeQuotaUsed"
                : "paywall.quotaUsed",
            {
              used: String(quota.searchesUsed),
              limit: String(quota.limit),
            },
          )}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3">
        {isProMonthlyCap || (isRoute && isProFairUseCap) ? (
          <Link
            href={isRoute ? "/" : "/"}
            className="rounded-lg bg-primary px-5 py-3 font-semibold text-on-primary transition-colors hover:bg-primary-container"
          >
            {t("pro.ctaDiscover")}
          </Link>
        ) : isProOneTimeCap || isFreeTier ? (
          <Link
            href="/pro"
            className="rounded-lg bg-primary px-5 py-3 font-semibold text-on-primary transition-colors hover:bg-primary-container"
          >
            {t("paywall.upgradePro")}
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-lg bg-primary px-5 py-3 font-semibold text-on-primary transition-colors hover:bg-primary-container"
            >
              {t("paywall.signIn")}
            </Link>
            {!isRoute ? (
              <button
                type="button"
                onClick={() => void createAndShare()}
                disabled={shareBusy}
                className="rounded-lg border border-outline-variant px-5 py-3 font-semibold text-on-surface transition-colors hover:bg-surface-container disabled:opacity-60"
              >
                {shareBusy ? t("paywall.sharing") : t("paywall.shareForCredit")}
              </button>
            ) : (
              <Link
                href="/pro"
                className="rounded-lg border border-outline-variant px-5 py-3 font-semibold text-on-surface transition-colors hover:bg-surface-container"
              >
                {t("paywall.upgradePro")}
              </Link>
            )}
          </>
        )}
      </div>

      {!isRoute && !isFreeTier && !isProFairUseCap ? (
      <div className="mt-8 border-t border-outline-variant/25 pt-6 text-left">
        <label className="block text-sm font-medium text-on-surface">
          {t("paywall.redeemLabel")}
          <input
            type="text"
            value={redeemToken}
            onChange={(e) => setRedeemToken(e.target.value)}
            placeholder={t("paywall.redeemPlaceholder")}
            className="mt-1 w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2.5 text-on-surface"
          />
        </label>
        <button
          type="button"
          onClick={() => void redeem()}
          disabled={redeemBusy || !redeemToken.trim()}
          className="mt-3 w-full rounded-lg border border-outline-variant px-5 py-2.5 font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-60"
        >
          {redeemBusy ? t("paywall.redeeming") : t("paywall.redeem")}
        </button>
      </div>
      ) : null}

      {message ? (
        <p className="mt-4 text-sm text-primary" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

/** Small remaining-searches chip for the discover header. */
export function QuotaHint({
  remaining,
  limit,
}: {
  remaining: number;
  limit: number;
}) {
  const { t } = useI18n();
  if (limit <= 0) return null;
  return (
    <p className="text-sm text-on-surface-variant">
      {t("paywall.remaining", {
        remaining: String(remaining),
        limit: String(limit),
      })}
    </p>
  );
}
