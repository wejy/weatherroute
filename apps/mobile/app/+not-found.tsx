import { useMemo } from "react";
import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "@/lib/i18n";
import type { AppColors } from "@/constants/Colors";
import { useColors } from "@/lib/theme";

export default function NotFoundScreen() {
  const { t } = useI18n();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <>
      <Stack.Screen options={{ title: t("mobile.notFoundTitle") }} />
      <View style={styles.container}>
        <Text style={styles.title}>{t("mobile.notFoundBody")}</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{t("mobile.notFoundCta")}</Text>
        </Link>
      </View>
    </>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.onSurface,
    },
    link: {
      marginTop: 16,
      paddingVertical: 12,
    },
    linkText: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: "600",
    },
  });
}
