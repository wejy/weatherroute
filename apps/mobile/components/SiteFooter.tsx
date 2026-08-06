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
import { useI18n } from "@/lib/i18n";
import type { AppColors } from "@/constants/Colors";
import { useColors } from "@/lib/theme";
import {
  contactEmailChars,
  resolveContactEmail,
} from "@/lib/contact-email";

export function SiteFooter() {
  const { t } = useI18n();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const chars = useMemo(() => contactEmailChars(), []);

  return (
    <View style={styles.footer} accessibilityRole="summary">
      <Text style={styles.brand}>{t("footer.brand")}</Text>
      <Text style={styles.tagline}>{t("footer.taglineEn1")}</Text>
      <Text style={styles.tagline}>{t("footer.taglineEn2")}</Text>
      <Text style={styles.tagline}>{t("footer.taglineFi1")}</Text>
      <Text style={styles.tagline}>{t("footer.taglineFi2")}</Text>
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
