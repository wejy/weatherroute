import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { ComponentProps } from "react";
import { Tabs } from "expo-router";
import { useI18n } from "@/lib/i18n";
import { colors } from "@/constants/Colors";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";

function TabBarIcon(props: {
  name: ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.outline,
        headerShown: useClientOnlyValue(false, true),
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.onSurface,
        tabBarStyle: {
          backgroundColor: colors.surfaceLowest,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("nav.discover"),
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="search" color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="routes"
        options={{
          title: t("nav.routes"),
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="road" color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("nav.sideSettings"),
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="cog" color={String(color)} />
          ),
        }}
      />
    </Tabs>
  );
}
