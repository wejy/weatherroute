import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { colors } from "@/constants/Colors";

function RootNavigator() {
  const { t } = useI18n();

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
        <Stack.Screen name="login" options={{ presentation: "modal" }} />
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
