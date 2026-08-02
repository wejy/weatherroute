import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { Link, type Href } from "expo-router";
import { useI18n } from "@/lib/i18n";
import { colors } from "@/constants/Colors";

const FEATURES = [
  "discover",
  "map",
  "dryTrip",
  "routes",
  "save",
  "share",
  "wikipedia",
  "bilingual",
] as const;

const FREE_KEYS = ["discovers", "results", "mapRoutes"] as const;
const PRO_KEYS = ["radius", "results", "sameCountry", "saves"] as const;

export default function AboutScreen() {
  const { t } = useI18n();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>{t("about.eyebrow")}</Text>
      <Text style={styles.brand}>{t("brand")}</Text>
      <Text style={styles.headline}>{t("about.headline")}</Text>
      <Text style={styles.lead}>{t("about.lead")}</Text>

      <View style={styles.purposeCard}>
        <Text style={styles.section}>{t("about.purposeTitle")}</Text>
        <Text style={styles.body}>{t("about.purposeBody")}</Text>
      </View>

      <View style={styles.whyCard}>
        <View style={styles.whySunGlow} pointerEvents="none" />
        <View style={styles.whySun} pointerEvents="none">
          {Array.from({ length: 8 }, (_, i) => (
            <View
              key={i}
              style={[
                styles.whySunRay,
                { transform: [{ rotate: `${i * 45 + 22.5}deg` }] },
              ]}
            />
          ))}
          <View style={styles.whySunCore} />
        </View>
        <Text style={styles.section}>{t("about.whyTitle")}</Text>
        <Text style={styles.body}>{t("about.whyBody")}</Text>
      </View>

      <Text style={styles.section}>{t("about.featuresTitle")}</Text>
      <Text style={styles.leadSmall}>{t("about.featuresLead")}</Text>
      {FEATURES.map((key) => (
        <View key={key} style={styles.featureCard}>
          <Text style={styles.featureTitle}>
            {t(`about.features.${key}.title`)}
          </Text>
          <Text style={styles.body}>{t(`about.features.${key}.body`)}</Text>
        </View>
      ))}

      <Text style={styles.section}>{t("about.plansTitle")}</Text>
      <Text style={styles.leadSmall}>{t("about.plansLead")}</Text>

      <View style={styles.planCard}>
        <Text style={styles.badge}>{t("about.freeTitle")}</Text>
        {FREE_KEYS.map((key) => (
          <Text key={key} style={styles.bullet}>
            ✓ {t(`about.freeItems.${key}`)}
          </Text>
        ))}
      </View>

      <View style={[styles.planCard, styles.proCard]}>
        <Text style={styles.proBadge}>{t("about.proTitle")}</Text>
        {PRO_KEYS.map((key) => (
          <Text key={key} style={styles.bulletPro}>
            ✓ {t(`about.proItems.${key}`)}
          </Text>
        ))}
      </View>

      <Text style={styles.hint}>{t("about.plansHint")}</Text>

      <Link href={"/pro" as Href} asChild>
        <Pressable style={styles.secondaryBtn}>
          <Text style={styles.secondaryText}>{t("about.plansCta")}</Text>
        </Pressable>
      </Link>
      <Link href={"/(tabs)" as Href} asChild>
        <Pressable style={styles.primaryBtn}>
          <Text style={styles.primaryText}>{t("about.ctaDiscover")}</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40, gap: 10 },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  brand: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.primary,
  },
  headline: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.onSurface,
    lineHeight: 28,
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurfaceVariant,
    marginBottom: 8,
  },
  leadSmall: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
    marginBottom: 4,
  },
  purposeCard: {
    marginTop: 8,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  whyCard: {
    marginTop: 4,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.surfaceLowest,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    overflow: "hidden",
    position: "relative",
  },
  whySun: {
    position: "absolute",
    top: "50%",
    right: 8,
    width: 140,
    height: 140,
    marginTop: -70,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.28,
  },
  whySunGlow: {
    position: "absolute",
    top: "50%",
    right: 0,
    width: 180,
    height: 180,
    marginTop: -90,
    borderRadius: 90,
    backgroundColor: colors.accent,
    opacity: 0.2,
  },
  whySunCore: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
  },
  whySunRay: {
    position: "absolute",
    left: 64,
    top: 0,
    width: 12,
    height: 140,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  section: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: "700",
    color: colors.onSurface,
  },
  featureCard: {
    padding: 14,
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
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  planCard: {
    marginTop: 4,
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
  bullet: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  bulletPro: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: colors.onSurface,
  },
  hint: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  secondaryBtn: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.secondary,
  },
  secondaryText: { color: "#fff", fontWeight: "700" },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: colors.onPrimary, fontWeight: "700" },
});
