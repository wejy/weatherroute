import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, useFocusEffect, type Href } from "expo-router";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getApiBaseUrl } from "@/lib/api";
import {
  fetchSession,
  signOutRemote,
  type DiscoverTier,
  type SessionUser,
} from "@/lib/session";
import { colors } from "@/constants/Colors";

export default function SettingsScreen() {
  const { t } = useI18n();
  const api = getApiBaseUrl();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [tier, setTier] = useState<DiscoverTier>("anon");
  const [loadingUser, setLoadingUser] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const refreshUser = useCallback(async () => {
    setLoadingUser(true);
    try {
      const next = await fetchSession();
      setUser(next.user);
      setTier(next.tier);
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
    } finally {
      setSigningOut(false);
    }
  }, []);

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
            <Text style={styles.tier}>
              {tier === "pro" ? t("settings.tierPro") : t("settings.tierFree")}
            </Text>
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
        <Link href={"/pro" as Href} asChild>
          <Pressable style={styles.signInBtn}>
            <Text style={styles.signInText}>{t("settings.subscriptionCta")}</Text>
          </Pressable>
        </Link>
        <Text style={styles.hint}>{t("settings.subscriptionSoon")}</Text>
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
  signInBtn: {
    marginTop: 4,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  signInText: { color: colors.onPrimary, fontWeight: "700" },
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
