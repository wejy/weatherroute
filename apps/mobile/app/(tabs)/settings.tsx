import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getApiBaseUrl } from "@/lib/api";
import { colors } from "@/constants/Colors";

export default function SettingsScreen() {
  const { t } = useI18n();
  const api = getApiBaseUrl();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t("nav.sideSettings")}</Text>

      <Text style={styles.label}>{t("language.label")}</Text>
      <LanguageSwitcher />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("brand")}</Text>
        <Text style={styles.cardBody}>
          {api || t("mobile.apiMissing")}
        </Text>
        {!api && (
          <Text style={styles.hint}>{t("mobile.openWebHint")}</Text>
        )}
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
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surfaceLowest,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.primary },
  cardBody: { fontSize: 14, color: colors.onSurface, fontFamily: "monospace" },
  hint: { fontSize: 13, color: colors.onSurfaceVariant },
});
