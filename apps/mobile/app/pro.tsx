import { useCallback, useEffect, useState } from "react";
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
import { colors } from "@/constants/Colors";
import { apiPost } from "@/lib/api";
import {
  isStripeCheckoutAllowed,
  openWebProPage,
} from "@/lib/billing";
import {
  fetchSession,
  type BillingPlan,
  type DiscoverTier,
} from "@/lib/session";

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
  "future",
] as const;

type CheckoutPlan = "one_time" | "monthly";

export default function ProMarketingScreen() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{
    checkout?: string | string[];
    plan?: string | string[];
  }>();
  const [signedIn, setSignedIn] = useState(false);
  const [tier, setTier] = useState<DiscoverTier>("anon");
  const [plan, setPlan] = useState<BillingPlan>("free");
  const [busy, setBusy] = useState<CheckoutPlan | "portal" | "web" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const allowStripe = isStripeCheckoutAllowed();

  const refresh = useCallback(async () => {
    const s = await fetchSession();
    setSignedIn(Boolean(s.user));
    setTier(s.tier);
    setPlan(s.plan);
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
  const planLabel =
    plan === "one_time"
      ? t("settings.planOneTime")
      : plan === "monthly"
        ? t("settings.planMonthly")
        : isPro
          ? t("settings.tierPro")
          : t("settings.tierFree");

  return (
    <>
      <Stack.Screen options={{ title: t("pro.title") }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.brand}>{t("brand")}</Text>
        <Text style={styles.title}>{t("pro.title")}</Text>
        <Text style={styles.subtitle}>{t("pro.subtitle")}</Text>
        {signedIn ? (
          <Text style={styles.currentPlan}>
            {t("pro.currentPlan", { plan: planLabel })}
          </Text>
        ) : null}
        {flash ? <Text style={styles.flash}>{flash}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!allowStripe ? (
          <Text style={styles.storeNote}>{t("pro.storePurchaseNote")}</Text>
        ) : null}

        <View style={styles.planCard}>
          <Text style={styles.badge}>{t("pro.oneTimeBadge")}</Text>
          <Text style={styles.planName}>{t("pro.oneTimePlan")}</Text>
          <Text style={styles.price}>{t("pro.oneTimePrice")}</Text>
          <Text style={styles.note}>{t("pro.oneTimePriceNote")}</Text>
          {signedIn ? (
            <Pressable
              style={styles.secondaryBtn}
              disabled={busy != null || isPro}
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

        <View style={[styles.planCard, styles.proCard]}>
          <Text style={styles.proBadge}>{t("pro.monthlyBadge")}</Text>
          <Text style={[styles.planName, styles.proName]}>
            {t("pro.monthlyPlan")}
          </Text>
          <Text style={styles.price}>{t("pro.monthlyPrice")}</Text>
          <Text style={styles.note}>{t("pro.monthlyPriceNote")}</Text>
          {signedIn ? (
            <Pressable
              style={styles.primaryBtn}
              disabled={busy != null || (isPro && plan === "monthly")}
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

        {signedIn ? (
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
                  ? t("pro.manageBilling")
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
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
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
  secondaryText: { color: colors.onSurfaceVariant, fontWeight: "700" },
  primaryBtn: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryText: { color: colors.onPrimary, fontWeight: "700" },
});
