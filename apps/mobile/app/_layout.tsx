import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { colors } from "@/constants/Colors";
import { createModuleLogger } from "@/lib/logger";
import { getApiBaseUrl } from "@/lib/api";

const log = createModuleLogger("root");

function RootNavigator() {
  const { t } = useI18n();

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
      <StatusBar style="dark" />
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
      <RootNavigator />
    </I18nProvider>
  );
}
