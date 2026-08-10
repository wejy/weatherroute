import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as WebBrowser from "expo-web-browser";
import { I18nProvider } from "@/lib/i18n";

SplashScreen.preventAutoHideAsync().catch(() => undefined);
WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <I18nProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </I18nProvider>
  );
}
