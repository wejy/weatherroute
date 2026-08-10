import { useMemo } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Link, type Href } from "expo-router";
import { useI18n } from "@/lib/i18n";
import type { AppColors } from "@/constants/Colors";
import { useColors } from "@/lib/theme";
import {
  contactEmailChars,
  resolveContactEmail,
} from "@/lib/contact-email";

const FOOTER_LINKS: { href: Href; labelKey: string }[] = [
  { href: "/(tabs)", labelKey: "nav.discover" },
  { href: "/(tabs)/map", labelKey: "nav.map" },
  { href: "/(tabs)/routes", labelKey: "nav.routes" },
  { href: "/trips", labelKey: "nav.trips" },
  { href: "/(tabs)/about", labelKey: "nav.about" },
  { href: "/pro", labelKey: "nav.subscription" },
  { href: "/(tabs)/settings", labelKey: "nav.sideSettings" },
];

export function SiteFooter() {
  const { t } = useI18n();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const chars = useMemo(() => contactEmailChars(), []);

  return (
    <View style={styles.footer} accessibilityRole="summary">
      <Text style={styles.brand}>{t("footer.brand")}</Text>
      <Text style={styles.tagline}>{t("footer.tagline1")}</Text>
      <Text style={styles.tagline}>{t("footer.tagline2")}</Text>
      <Text style={styles.linksLabel}>{t("footer.linksLabel")}</Text>
      <View style={styles.links}>
        {FOOTER_LINKS.map((link) => (
          <Link key={String(link.href)} href={link.href} asChild>
            <Pressable
              accessibilityRole="link"
              style={styles.linkBtn}
              hitSlop={6}
            >
              <Text style={styles.linkText}>{t(link.labelKey)}</Text>
            </Pressable>
          </Link>
        ))}
      </View>
      <Text style={styles.copyright}>{t("footer.copyright")}</Text>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={t("footer.contactAria")}
        onPress={() => {
          void Linking.openURL(`mailto:${resolveContactEmail()}`);
        }}
        style={styles.emailBtn}
      >
        <View style={styles.emailRow} accessible={false}>
          {chars.map((ch, i) => (
            <Text key={i} style={styles.emailChar}>
              {ch}
            </Text>
          ))}
        </View>
      </Pressable>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    footer: {
      marginTop: 28,
      paddingTop: 20,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.outlineVariant,
      gap: 4,
    } satisfies ViewStyle,
    brand: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.onSurface,
      marginBottom: 6,
    } satisfies TextStyle,
    tagline: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.onSurfaceVariant,
    } satisfies TextStyle,
    linksLabel: {
      marginTop: 14,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.6,
      textTransform: "uppercase",
      color: colors.onSurfaceVariant,
    } satisfies TextStyle,
    links: {
      marginTop: 6,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      columnGap: 14,
      rowGap: 6,
    } satisfies ViewStyle,
    linkBtn: {
      minHeight: 36,
      justifyContent: "center",
    } satisfies ViewStyle,
    linkText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.primary,
    } satisfies TextStyle,
    copyright: {
      marginTop: 12,
      fontSize: 11,
      color: colors.onSurfaceVariant,
    } satisfies TextStyle,
    emailBtn: {
      alignSelf: "flex-start",
      marginTop: 8,
      minHeight: 44,
      justifyContent: "center",
    } satisfies ViewStyle,
    emailRow: {
      flexDirection: "row",
      flexWrap: "wrap",
    } satisfies ViewStyle,
    emailChar: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: "600",
    } satisfies TextStyle,
  });
}
