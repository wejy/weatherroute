import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { ThemeProvider, useColors, useTheme } from "@/lib/theme";
import { createModuleLogger } from "@/lib/logger";
import { getApiBaseUrl } from "@/lib/api";

const log = createModuleLogger("root");

function RootNavigator() {
  const { t } = useI18n();
  const colors = useColors();
  const { resolved } = useTheme();

  useEffect(() => {
    log.info(
      {
        platform: Platform.OS,
        apiBase: getApiBaseUrl() || null,
      },
      "Solviax mobile started",
    );
  }, []);

  return (
    <>
      <StatusBar style={resolved === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="destination/[slug]"
          options={{
            title: t("mobile.destinationTitle"),
            presentation: "card",
          }}
        />
        <Stack.Screen
          name="trips"
          options={{ title: t("trips.title"), presentation: "card" }}
        />
        <Stack.Screen name="login" options={{ presentation: "modal" }} />
        <Stack.Screen name="pro" options={{ presentation: "card" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <RootNavigator />
      </ThemeProvider>
    </I18nProvider>
  );
}
