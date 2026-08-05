import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Link, useFocusEffect, type Href } from "expo-router";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { apiPatch, apiPost, getApiBaseUrl } from "@/lib/api";
import { formatIsoDateForLocale } from "@/lib/dates";
import {
  fetchSession,
  signOutRemote,
  type BillingPlan,
  type DiscoverTier,
  type SessionUser,
} from "@/lib/session";
import { colors } from "@/constants/Colors";
import {
  isStripeCheckoutAllowed,
  openWebProPage,
} from "@/lib/billing";

export default function SettingsScreen() {
  const { t, locale } = useI18n();
  const api = getApiBaseUrl();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [tier, setTier] = useState<DiscoverTier>("anon");
  const [plan, setPlan] = useState<BillingPlan>("free");
  const [canManageBilling, setCanManageBilling] = useState(false);
  const [proSince, setProSince] = useState<string | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [oneTimePaidAt, setOneTimePaidAt] = useState<string | null>(null);
  const [oneTimeExpiresAt, setOneTimeExpiresAt] = useState<string | null>(null);
  const [sameCountryOnly, setSameCountryOnly] = useState(false);
  const [sameCountryEffective, setSameCountryEffective] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [savingCountry, setSavingCountry] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const allowStripe = isStripeCheckoutAllowed();

  const refreshUser = useCallback(async () => {
    setLoadingUser(true);
    try {
      const next = await fetchSession();
      setUser(next.user);
      setTier(next.tier);
      setPlan(next.plan);
      setCanManageBilling(next.canManageBilling);
      setProSince(next.proSince);
      setCurrentPeriodEnd(next.currentPeriodEnd);
      setOneTimePaidAt(next.oneTimePaidAt);
      setOneTimeExpiresAt(next.oneTimeExpiresAt);
      setSameCountryOnly(next.sameCountryOnly);
      setSameCountryEffective(next.sameCountryOnlyEffective);
    } finally {
      setLoadingUser(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshUser();
    }, [refreshUser]),
  );

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const onSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOutRemote();
      setUser(null);
      setTier("anon");
      setPlan("free");
      setCanManageBilling(false);
      setProSince(null);
      setCurrentPeriodEnd(null);
      setOneTimePaidAt(null);
      setOneTimeExpiresAt(null);
      setSameCountryOnly(false);
      setSameCountryEffective(false);
    } finally {
      setSigningOut(false);
    }
  }, []);

  const onToggleSameCountry = useCallback(
    async (next: boolean) => {
      if (!user || savingCountry) return;
      const prev = sameCountryOnly;
      setSameCountryOnly(next);
      setSavingCountry(true);
      try {
        const data = await apiPatch<{
          sameCountryOnly: boolean;
          sameCountryOnlyEffective: boolean;
        }>("/api/settings/preferences", { sameCountryOnly: next });
        setSameCountryOnly(data.sameCountryOnly);
        setSameCountryEffective(data.sameCountryOnlyEffective);
      } catch {
        setSameCountryOnly(prev);
      } finally {
        setSavingCountry(false);
      }
    },
    [user, savingCountry, sameCountryOnly],
  );

  const isPro = tier === "pro";
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

  const openPortal = useCallback(async () => {
    if (portalBusy) return;
    setPortalBusy(true);
    try {
      if (!allowStripe) {
        await openWebProPage();
        return;
      }
      const data = await apiPost<{ url: string }>("/api/billing/portal", {
        returnToApp: true,
      });
      await Linking.openURL(data.url);
    } finally {
      setPortalBusy(false);
    }
  }, [allowStripe, portalBusy]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t("nav.sideSettings")}</Text>

      <Text style={styles.label}>{t("settings.account")}</Text>
      <View style={styles.card}>
        {loadingUser ? (
          <ActivityIndicator color={colors.primary} />
        ) : user ? (
          <>
            <Text style={styles.cardTitle}>{user.displayName}</Text>
            <Text style={styles.cardBody}>{user.email}</Text>
            <Text style={styles.tier}>{planLabel}</Text>
            <Pressable
              onPress={() => void onSignOut()}
              disabled={signingOut}
              style={[styles.signOutBtn, signingOut && styles.disabled]}
            >
              {signingOut ? (
                <ActivityIndicator color={colors.error} />
              ) : (
                <Text style={styles.signOutText}>{t("login.signOut")}</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.cardBody}>{t("settings.notSignedIn")}</Text>
            <Link href="/login" asChild>
              <Pressable style={styles.signInBtn}>
                <Text style={styles.signInText}>{t("paywall.signIn")}</Text>
              </Pressable>
            </Link>
          </>
        )}
      </View>

      <Text style={styles.label}>{t("settings.sameCountryTitle")}</Text>
      <View style={styles.card}>
        <Text style={styles.cardBody}>{t("settings.sameCountryHint")}</Text>
        {user ? (
          <>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>
                {t("settings.sameCountryLabel")}
              </Text>
              {savingCountry ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Switch
                  value={sameCountryOnly}
                  onValueChange={(v) => void onToggleSameCountry(v)}
                  trackColor={{
                    false: colors.outlineVariant,
                    true: colors.primaryContainer,
                  }}
                  thumbColor={sameCountryOnly ? colors.primary : colors.surfaceLowest}
                />
              )}
            </View>
            {!isPro ? (
              <Text style={styles.hint}>{t("settings.sameCountryProNote")}</Text>
            ) : sameCountryEffective ? (
              <Text style={styles.hint}>{t("settings.sameCountryActive")}</Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.hint}>{t("settings.sameCountrySignInNote")}</Text>
        )}
      </View>

      <Text style={styles.label}>{t("nav.about")}</Text>
      <View style={styles.card}>
        <Text style={styles.cardBody}>{t("about.lead")}</Text>
        <Link href={"/(tabs)/about" as Href} asChild>
          <Pressable style={styles.signInBtn}>
            <Text style={styles.signInText}>{t("nav.about")}</Text>
          </Pressable>
        </Link>
      </View>

      <Text style={styles.label}>{t("settings.subscriptionTitle")}</Text>
      <View style={styles.card}>
        <Text style={styles.cardBody}>{t("settings.subscriptionBody")}</Text>
        {user ? (
          <>
            <Text style={styles.tier}>{planLabel}</Text>
            {isPro && startedLabel ? (
              <Text style={styles.hint}>
                {t("pro.startedOn", { date: startedLabel })}
              </Text>
            ) : null}
            {isPro && plan === "one_time" && validUntilLabel ? (
              <Text style={styles.hint}>
                {t("pro.validUntil", { date: validUntilLabel })}
              </Text>
            ) : null}
            {isPro &&
            (plan === "monthly" || plan === "yearly") &&
            renewsLabel ? (
              <Text style={styles.hint}>
                {t("pro.renewsOn", { date: renewsLabel })}
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.hint}>{t("settings.subscriptionSignInHint")}</Text>
        )}
        <Link href={"/pro" as Href} asChild>
          <Pressable style={styles.signInBtn}>
            <Text style={styles.signInText}>{t("settings.subscriptionCta")}</Text>
          </Pressable>
        </Link>
        {user && canManageBilling ? (
          <>
            <Pressable
              style={styles.manageBtn}
              disabled={portalBusy}
              onPress={() => void openPortal()}
            >
              {portalBusy ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.manageText}>
                  {allowStripe
                    ? t("settings.subscriptionManage")
                    : t("pro.manageOnWeb")}
                </Text>
              )}
            </Pressable>
            <Text style={styles.hint}>{t("settings.subscriptionStatusHint")}</Text>
          </>
        ) : null}
      </View>

      <Text style={styles.label}>{t("language.label")}</Text>
      <LanguageSwitcher />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("brand")}</Text>
        <Text style={styles.cardBody}>{api || t("mobile.apiMissing")}</Text>
        {!api && <Text style={styles.hint}>{t("mobile.openWebHint")}</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.onSurface,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
  },
  card: {
    marginTop: 4,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surfaceLowest,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.primary },
  cardBody: { fontSize: 14, color: colors.onSurface },
  tier: { fontSize: 13, color: colors.onSurfaceVariant, fontWeight: "600" },
  hint: { fontSize: 13, color: colors.onSurfaceVariant },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 4,
  },
  switchLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.onSurface,
  },
  signInBtn: {
    marginTop: 4,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  signInText: { color: colors.onPrimary, fontWeight: "700" },
  manageBtn: {
    marginTop: 4,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  manageText: { color: colors.onSurfaceVariant, fontWeight: "700" },
  signOutBtn: {
    marginTop: 4,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutText: { color: colors.error, fontWeight: "700" },
  disabled: { opacity: 0.55 },
});
