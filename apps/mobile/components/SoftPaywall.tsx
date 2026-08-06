import { useCallback, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link } from "expo-router";
import { useI18n } from "@/lib/i18n";
import { apiPost, getApiBaseUrl, type PublicQuota } from "@/lib/api";
import type { AppColors } from "@/constants/Colors";
import { useColors } from "@/lib/theme";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("paywall");

export function SoftPaywall({
  quota,
  onRedeemed,
  surface = "discover",
}: {
  quota: PublicQuota | null;
  onRedeemed?: () => void;
  surface?: "discover" | "route";
}) {
  const { t } = useI18n();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isRoute = surface === "route";
  const isFreeTier = quota?.kind === "free";
  const isProMonthlyCap = quota?.kind === "pro_monthly";
  const isProOneTimeCap = quota?.kind === "pro_one_time";
  const isProFairUseCap = isProMonthlyCap || isProOneTimeCap;
  const isNetworkCap = quota?.blockReason === "ip";
  const [shareBusy, setShareBusy] = useState(false);
  const [redeemToken, setRedeemToken] = useState("");
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
      const data = await apiPost<{ token?: string; error?: string }>(
        "/api/share",
        { action: "create" },
      );
      if (!data.token) throw new Error("share_failed");
      const base = getApiBaseUrl() || "https://solviax.app";
      const url = `${base}/?share=${data.token}`;
      await Share.share({
        message: `${t("paywall.shareText")}\n${url}`,
        url,
        title: t("brand"),
      });
      setMessage(t("paywall.shareDone"));
      log.info("share created");
    } catch (e) {
      log.warn({ err: e }, "share failed");
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
      const data = await apiPost<{ ok?: boolean }>("/api/share", {
        action: "redeem",
        token,
      });
      if (!data.ok) throw new Error("redeem_failed");
      setMessage(t("paywall.redeemDone"));
      log.info("share redeemed");
      onRedeemed?.();
    } catch (e) {
      log.warn({ err: e }, "redeem failed");
      setError(t("paywall.redeemError"));
    } finally {
      setRedeemBusy(false);
    }
  }, [onRedeemed, redeemToken, t]);

  return (
    <View style={styles.card}>
      <FontAwesome
        name="unlock-alt"
        size={36}
        color={colors.primary}
        style={styles.icon}
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {quota ? (
        <Text style={styles.quota}>
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
        </Text>
      ) : null}

      {isProMonthlyCap || (isRoute && isProFairUseCap) ? (
        <Link href="/(tabs)" asChild>
          <Pressable style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>{t("pro.ctaDiscover")}</Text>
          </Pressable>
        </Link>
      ) : isProOneTimeCap || isFreeTier ? (
        <Link href="/pro" asChild>
          <Pressable style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>{t("paywall.upgradePro")}</Text>
          </Pressable>
        </Link>
      ) : (
        <>
          <Link href="/login" asChild>
            <Pressable style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>{t("paywall.signIn")}</Text>
            </Pressable>
          </Link>

          {!isRoute ? (
            <>
              <Pressable
                onPress={() => void createAndShare()}
                disabled={shareBusy}
                style={[styles.secondaryBtn, shareBusy && styles.disabled]}
              >
                {shareBusy ? (
                  <ActivityIndicator color={colors.onSurface} />
                ) : (
                  <Text style={styles.secondaryBtnText}>
                    {t("paywall.shareForCredit")}
                  </Text>
                )}
              </Pressable>

              <View style={styles.redeemBox}>
                <Text style={styles.redeemLabel}>{t("paywall.redeemLabel")}</Text>
                <TextInput
                  value={redeemToken}
                  onChangeText={setRedeemToken}
                  placeholder={t("paywall.redeemPlaceholder")}
                  placeholderTextColor={colors.outline}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
                <Pressable
                  onPress={() => void redeem()}
                  disabled={redeemBusy || !redeemToken.trim()}
                  style={[
                    styles.secondaryBtn,
                    (redeemBusy || !redeemToken.trim()) && styles.disabled,
                  ]}
                >
                  {redeemBusy ? (
                    <ActivityIndicator color={colors.onSurface} />
                  ) : (
                    <Text style={styles.secondaryBtnText}>
                      {t("paywall.redeem")}
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          ) : (
            <Link href="/pro" asChild>
              <Pressable style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>
                  {t("paywall.upgradePro")}
                </Text>
              </Pressable>
            </Link>
          )}
        </>
      )}

      {message ? (
        <Text style={styles.message} accessibilityRole="text">
          {message}
        </Text>
      ) : null}
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function QuotaHint({
  remaining,
  limit,
}: {
  remaining: number;
  limit: number;
}) {
  const { t } = useI18n();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (limit <= 0) return null;
  return (
    <Text style={styles.hint}>
      {t("paywall.remaining", {
        remaining: String(remaining),
        limit: String(limit),
      })}
    </Text>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  card: {
    marginTop: 8,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLowest,
    alignItems: "center",
    gap: 10,
  },
  icon: { marginBottom: 4 },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.onSurface,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    lineHeight: 22,
  },
  quota: { fontSize: 13, color: colors.onSurfaceVariant },
  primaryBtn: {
    marginTop: 8,
    alignSelf: "stretch",
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: colors.onPrimary, fontWeight: "700", fontSize: 15 },
  secondaryBtn: {
    alignSelf: "stretch",
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: colors.onSurface,
    fontWeight: "700",
    fontSize: 15,
  },
  redeemBox: {
    marginTop: 12,
    alignSelf: "stretch",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    paddingTop: 16,
    gap: 8,
  },
  redeemLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurface,
  },
  input: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 12,
    color: colors.onSurface,
    fontWeight: "600",
  },
  message: { color: colors.primary, fontSize: 13, textAlign: "center" },
  error: { color: colors.error, fontSize: 13, textAlign: "center" },
  hint: { fontSize: 13, color: colors.onSurfaceVariant },
  disabled: { opacity: 0.55 },
});
}
