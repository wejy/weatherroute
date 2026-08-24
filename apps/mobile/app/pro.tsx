import { useCallback, useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, Stack, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useI18n } from "@/lib/i18n";
import type { AppColors } from "@/constants/Colors";
import { useColors } from "@/lib/theme";
import { apiGet, apiPost } from "@/lib/api";
import { formatIsoDateForLocale } from "@/lib/dates";
import { formatPaymentAmount } from "@/lib/money";
import {
  isStripeCheckoutAllowed,
  openWebProPage,
} from "@/lib/billing";
import {
  fetchSession,
  type BillingPlan,
  type DiscoverTier,
} from "@/lib/session";
import { SiteFooter } from "@/components/SiteFooter";

const FEATURE_KEYS = [
  "radius",
  "results",
  "departure",
  "sameCountry",
  "routes",
  "discovers",
] as const;
const HIGHLIGHT_KEYS = [
  "radius",
  "results",
  "departure",
  "sameCountry",
  "routes",
  "discovers",
  "future",
] as const;

type CheckoutPlan = "one_time" | "monthly" | "yearly";

type PaymentRow = {
  id: string;
  paidAt: string;
  amountCents: number;
  currency: string;
};

export default function ProMarketingScreen() {
  const { t, locale } = useI18n();

  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{
    checkout?: string | string[];
    plan?: string | string[];
  }>();
  const [signedIn, setSignedIn] = useState(false);
  const [tier, setTier] = useState<DiscoverTier>("anon");
  const [plan, setPlan] = useState<BillingPlan>("free");
  const [canManageBilling, setCanManageBilling] = useState(false);
  const [proSince, setProSince] = useState<string | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [oneTimePaidAt, setOneTimePaidAt] = useState<string | null>(null);
  const [oneTimeExpiresAt, setOneTimeExpiresAt] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [busy, setBusy] = useState<CheckoutPlan | "portal" | "web" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const allowStripe = isStripeCheckoutAllowed();

  const refresh = useCallback(async () => {
    const s = await fetchSession();
    setSignedIn(Boolean(s.user));
    setTier(s.tier);
    setPlan(s.plan);
    setCanManageBilling(s.canManageBilling);
    setProSince(s.proSince);
    setCurrentPeriodEnd(s.currentPeriodEnd);
    setCancelAtPeriodEnd(s.cancelAtPeriodEnd);
    setOneTimePaidAt(s.oneTimePaidAt);
    setOneTimeExpiresAt(s.oneTimeExpiresAt);

    const showPayments = Boolean(s.user && s.canManageBilling);
    if (!showPayments) {
      setPayments([]);
      return;
    }
    setPaymentsLoading(true);
    try {
      const data = await apiGet<{ payments?: PaymentRow[] }>(
        "/api/billing/payments",
      );
      setPayments(Array.isArray(data.payments) ? data.payments : []);
    } catch {
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const checkout = Array.isArray(params.checkout)
      ? params.checkout[0]
      : params.checkout;
    if (checkout === "success") {
      setFlash(t("pro.checkoutSuccess"));
      void refresh();
    } else if (checkout === "cancel") {
      setFlash(t("pro.checkoutCancel"));
    }
  }, [params.checkout, refresh, t]);

  const startCheckout = useCallback(
    async (checkoutPlan: CheckoutPlan) => {
      setError(null);
      setFlash(null);
      if (!allowStripe) {
        setBusy("web");
        try {
          const ok = await openWebProPage();
          if (!ok) setError(t("pro.checkoutUnavailable"));
        } catch {
          setError(t("pro.checkoutError"));
        } finally {
          setBusy(null);
        }
        return;
      }
      setBusy(checkoutPlan);
      try {
        const data = await apiPost<{ url: string }>("/api/billing/checkout", {
          plan: checkoutPlan,
          returnToApp: true,
        });
        await Linking.openURL(data.url);
      } catch {
        setError(t("pro.checkoutError"));
      } finally {
        setBusy(null);
      }
    },
    [allowStripe, t],
  );

  const openPortal = useCallback(async () => {
    setError(null);
    setFlash(null);
    if (!allowStripe) {
      setBusy("web");
      try {
        const ok = await openWebProPage();
        if (!ok) setError(t("pro.checkoutUnavailable"));
      } catch {
        setError(t("pro.checkoutError"));
      } finally {
        setBusy(null);
      }
      return;
    }
    setBusy("portal");
    try {
      const data = await apiPost<{ url: string }>("/api/billing/portal", {
        returnToApp: true,
      });
      await Linking.openURL(data.url);
    } catch {
      setError(t("pro.checkoutError"));
    } finally {
      setBusy(null);
    }
  }, [allowStripe, t]);

  const isPro = tier === "pro";
  const showStatus = signedIn && (isPro || canManageBilling);
  const planLabel =
    plan === "one_time"
      ? t("settings.planOneTime")
      : plan === "monthly"
        ? t("settings.planMonthly")
        : plan === "yearly"
          ? t("settings.planYearly")
          : isPro
            ? t("settings.tierPro")
            : t("settings.tierFree");

  const startedLabel = formatIsoDateForLocale(
    proSince ?? oneTimePaidAt,
    locale,
  );
  const validUntilLabel = formatIsoDateForLocale(oneTimeExpiresAt, locale);
  const renewsLabel = formatIsoDateForLocale(currentPeriodEnd, locale);

  return (
    <>
      <Stack.Screen options={{ title: t("pro.title") }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.brand}>{t("brand")}</Text>
        <Text style={styles.title}>{t("pro.title")}</Text>
        <Text style={styles.subtitle}>{t("pro.subtitle")}</Text>
        {showStatus ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusEyebrow}>{t("pro.statusTitle")}</Text>
            <View style={styles.statusTitleRow}>
              <Text style={styles.statusTitle}>
                {isPro
                  ? cancelAtPeriodEnd
                    ? t("pro.statusCanceling")
                    : t("pro.statusActive")
                  : t("pro.currentPlan", { plan: planLabel })}
              </Text>
              {isPro ? (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>
                    {t("settings.activeBadge")}
                  </Text>
                </View>
              ) : null}
            </View>
            {isPro ? (
              <Text style={styles.currentPlan}>
                {t("pro.currentPlan", { plan: planLabel })}
              </Text>
            ) : null}
            {startedLabel ? (
              <Text style={styles.statusLine}>
                {t("pro.startedOn", { date: startedLabel })}
              </Text>
            ) : null}
            {plan === "one_time" && validUntilLabel ? (
              <Text style={styles.statusLine}>
                {t("pro.validUntil", { date: validUntilLabel })}
              </Text>
            ) : null}
            {(plan === "monthly" || plan === "yearly") && renewsLabel ? (
              <Text style={styles.statusLine}>
                {cancelAtPeriodEnd
                  ? t("pro.cancelingEndsOn", { date: renewsLabel })
                  : t("pro.renewsOn", { date: renewsLabel })}
              </Text>
            ) : null}

            <Text style={styles.historyTitle}>
              {t("pro.paymentHistoryTitle")}
            </Text>
            {paymentsLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : payments.length > 0 ? (
              <View style={styles.historyTable}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyHeaderText}>
                    {t("pro.paymentDate")}
                  </Text>
                  <Text style={[styles.historyHeaderText, styles.historyAmount]}>
                    {t("pro.paymentAmount")}
                  </Text>
                </View>
                {payments.map((p) => (
                  <View key={p.id} style={styles.historyRow}>
                    <Text style={styles.historyDate}>
                      {formatIsoDateForLocale(p.paidAt, locale)}
                    </Text>
                    <Text style={[styles.historySum, styles.historyAmount]}>
                      {formatPaymentAmount(p.amountCents, p.currency, locale)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.statusHint}>
                {t("pro.paymentHistoryEmpty")}
              </Text>
            )}

            {canManageBilling ? (
              <>
                <Pressable
                  style={styles.secondaryBtn}
                  disabled={busy != null}
                  onPress={() => void openPortal()}
                >
                  {busy === "portal" || busy === "web" ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <Text style={styles.secondaryText}>
                      {allowStripe
                        ? cancelAtPeriodEnd
                          ? t("pro.manageBillingCanceling")
                          : t("pro.manageBilling")
                        : t("pro.manageOnWeb")}
                    </Text>
                  )}
                </Pressable>
                <Text style={styles.statusHint}>
                  {cancelAtPeriodEnd
                    ? t("pro.manageBillingHintCanceling")
                    : t("pro.manageBillingHint")}
                </Text>
              </>
            ) : null}
          </View>
        ) : signedIn ? (
          <Text style={styles.currentPlan}>
            {t("pro.currentPlan", { plan: planLabel })}
          </Text>
        ) : null}
        {flash ? <Text style={styles.flash}>{flash}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!allowStripe ? (
          <Text style={styles.storeNote}>{t("pro.storePurchaseNote")}</Text>
        ) : null}

        <View style={[styles.planCard, isPro && styles.dimmed]}>
          <Text style={styles.badge}>{t("pro.oneTimeBadge")}</Text>
          <Text style={styles.planName}>{t("pro.oneTimePlan")}</Text>
          <Text style={styles.price}>{t("pro.oneTimePrice")}</Text>
          <Text style={styles.vatNote}>{t("pro.vatInclusive")}</Text>
          <Text style={styles.note}>{t("pro.oneTimePriceNote")}</Text>
          {isPro ? (
            <Text style={styles.alreadyPro}>{t("pro.alreadyPro")}</Text>
          ) : signedIn ? (
            <Pressable
              style={styles.secondaryBtn}
              disabled={busy != null}
              onPress={() => void startCheckout("one_time")}
            >
              {busy === "one_time" || busy === "web" ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.secondaryText}>
                  {allowStripe
                    ? t("pro.buyOneTime")
                    : t("pro.openWebToBuy")}
                </Text>
              )}
            </Pressable>
          ) : (
            <Link href={"/login" as Href} asChild>
              <Pressable style={styles.secondaryBtn}>
                <Text style={styles.secondaryText}>{t("pro.ctaSignIn")}</Text>
              </Pressable>
            </Link>
          )}
        </View>

        <View
          style={[
            styles.planCard,
            styles.proCard,
            isPro && (plan === "monthly" || plan === "yearly") && styles.dimmed,
          ]}
        >
          <Text style={styles.proBadge}>{t("pro.monthlyBadge")}</Text>
          <Text style={[styles.planName, styles.proName]}>
            {t("pro.monthlyPlan")}
          </Text>
          <Text style={styles.price}>{t("pro.monthlyPrice")}</Text>
          <Text style={styles.vatNote}>{t("pro.vatInclusive")}</Text>
          <Text style={styles.note}>{t("pro.monthlyPriceNote")}</Text>
          {isPro && (plan === "monthly" || plan === "yearly") ? (
            <Text style={styles.alreadyPro}>{t("pro.alreadyPro")}</Text>
          ) : signedIn ? (
            <Pressable
              style={styles.primaryBtn}
              disabled={busy != null}
              onPress={() => void startCheckout("monthly")}
            >
              {busy === "monthly" || busy === "web" ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.primaryText}>
                  {allowStripe
                    ? t("pro.buyMonthly")
                    : t("pro.openWebToBuy")}
                </Text>
              )}
            </Pressable>
          ) : (
            <Link href={"/login" as Href} asChild>
              <Pressable style={styles.primaryBtn}>
                <Text style={styles.primaryText}>{t("pro.ctaSignIn")}</Text>
              </Pressable>
            </Link>
          )}
        </View>

        <View
          style={[
            styles.planCard,
            styles.proCard,
            isPro && (plan === "monthly" || plan === "yearly") && styles.dimmed,
          ]}
        >
          <Text style={styles.proBadge}>{t("pro.yearlyBadge")}</Text>
          <Text style={[styles.planName, styles.proName]}>
            {t("pro.yearlyPlan")}
          </Text>
          <Text style={styles.price}>{t("pro.yearlyPrice")}</Text>
          <Text style={styles.vatNote}>{t("pro.vatInclusive")}</Text>
          <Text style={styles.note}>{t("pro.yearlyPriceNote")}</Text>
          {isPro && (plan === "monthly" || plan === "yearly") ? (
            <Text style={styles.alreadyPro}>{t("pro.alreadyPro")}</Text>
          ) : signedIn ? (
            <Pressable
              style={styles.primaryBtn}
              disabled={busy != null}
              onPress={() => void startCheckout("yearly")}
            >
              {busy === "yearly" || busy === "web" ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.primaryText}>
                  {allowStripe
                    ? t("pro.buyYearly")
                    : t("pro.openWebToBuy")}
                </Text>
              )}
            </Pressable>
          ) : (
            <Link href={"/login" as Href} asChild>
              <Pressable style={styles.primaryBtn}>
                <Text style={styles.primaryText}>{t("pro.ctaSignIn")}</Text>
              </Pressable>
            </Link>
          )}
        </View>

        {signedIn && canManageBilling && !isPro ? (
          <Pressable
            style={styles.secondaryBtn}
            disabled={busy != null}
            onPress={() => void openPortal()}
          >
            {busy === "portal" || busy === "web" ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.secondaryText}>
                {allowStripe
                  ? cancelAtPeriodEnd
                    ? t("pro.manageBillingCanceling")
                    : t("pro.manageBilling")
                  : t("pro.manageOnWeb")}
              </Text>
            )}
          </Pressable>
        ) : null}

        <Text style={styles.section}>{t("pro.comparisonTitle")}</Text>
        {FEATURE_KEYS.map((key) => (
          <View key={key} style={styles.featureCard}>
            <Text style={styles.featureTitle}>
              {t(`pro.rows.${key}.title`)}
            </Text>
            <Text style={styles.colLabel}>{t("pro.freeCol")}</Text>
            <Text style={styles.freeValue}>{t(`pro.rows.${key}.free`)}</Text>
            <Text style={styles.colLabel}>{t("pro.oneTimeCol")}</Text>
            <Text style={styles.freeValue}>{t(`pro.rows.${key}.oneTime`)}</Text>
            <Text style={[styles.colLabel, styles.proLabel]}>
              {t("pro.monthlyCol")}
            </Text>
            <Text style={styles.proValue}>{t(`pro.rows.${key}.monthly`)}</Text>
            <Text style={[styles.colLabel, styles.proLabel]}>
              {t("pro.yearlyCol")}
            </Text>
            <Text style={styles.proValue}>{t(`pro.rows.${key}.yearly`)}</Text>
          </View>
        ))}

        <Text style={styles.section}>{t("pro.highlightsTitle")}</Text>
        {HIGHLIGHT_KEYS.map((key) => (
          <View key={key} style={styles.highlightRow}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.highlightText}>
              {t(`pro.highlights.${key}`)}
            </Text>
          </View>
        ))}

        <Link href={"/(tabs)/settings" as Href} asChild>
          <Pressable style={styles.secondaryBtn}>
            <Text style={styles.secondaryText}>{t("pro.ctaSettings")}</Text>
          </Pressable>
        </Link>

        <SiteFooter />
      </ScrollView>
    </>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40, gap: 12 },
  brand: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  title: { fontSize: 28, fontWeight: "800", color: colors.onSurface },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurfaceVariant,
    marginBottom: 4,
  },
  currentPlan: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  statusCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(20, 184, 99, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 99, 0.35)",
    gap: 6,
  },
  statusEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.onSurface,
    flexShrink: 1,
  },
  statusTitleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  activeBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(11, 122, 74, 0.35)",
    backgroundColor: "rgba(11, 122, 74, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.primary,
  },
  statusLine: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
  statusHint: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  historyTitle: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurface,
  },
  historyTable: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLowest,
    overflow: "hidden",
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  historyDate: { fontSize: 14, color: colors.onSurface },
  historySum: { fontSize: 14, fontWeight: "600", color: colors.onSurface },
  historyAmount: { textAlign: "right" },
  alreadyPro: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
  },
  dimmed: { opacity: 0.7 },
  flash: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.primary,
    backgroundColor: "rgba(20, 184, 99, 0.1)",
    padding: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  storeNote: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
  error: { color: colors.error, fontSize: 14 },
  planCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surfaceLowest,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  proCard: {
    borderColor: "rgba(20, 184, 99, 0.35)",
    backgroundColor: "rgba(20, 184, 99, 0.06)",
  },
  badge: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
    backgroundColor: colors.surfaceContainer,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  proBadge: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    backgroundColor: "rgba(20, 184, 99, 0.12)",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planName: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  proName: { color: colors.primary },
  price: { fontSize: 24, fontWeight: "800", color: colors.onSurface },
  vatNote: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },
  note: { fontSize: 14, lineHeight: 20, color: colors.onSurfaceVariant },
  section: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: colors.onSurface,
  },
  featureCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surfaceLowest,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: 4,
  },
  colLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
    marginTop: 4,
  },
  proLabel: { color: colors.primary },
  freeValue: { fontSize: 14, lineHeight: 20, color: colors.onSurfaceVariant },
  proValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: colors.onSurface,
  },
  highlightRow: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surfaceLowest,
    borderWidth: 1,
    borderColor: colors.border,
  },
  check: { color: colors.primary, fontWeight: "800", fontSize: 16, marginTop: 1 },
  highlightText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },
  secondaryBtn: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  secondaryText: {
    color: colors.onSurfaceVariant,
    fontWeight: "700",
    textAlign: "center",
  },
  primaryBtn: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryText: {
    color: colors.onPrimary,
    fontWeight: "700",
    textAlign: "center",
  },
});
}
