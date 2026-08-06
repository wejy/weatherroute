import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "@/lib/i18n";
import type { AppColors } from "@/constants/Colors";
import { useColors } from "@/lib/theme";
import type { Locale } from "@solviax/i18n";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const options: Locale[] = ["en", "fi"];

  return (
    <View
      accessibilityRole="toolbar"
      accessibilityLabel={t("language.label")}
      style={styles.row}
    >
      {options.map((code) => {
        const active = locale === code;
        return (
          <Pressable
            key={code}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => setLocale(code)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {t(`language.${code}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: "row", gap: 8 },
    chip: {
      minHeight: 44,
      paddingHorizontal: 16,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceLowest,
      justifyContent: "center",
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.onSurface,
    },
    labelActive: {
      color: colors.onPrimary,
    },
  });
}
