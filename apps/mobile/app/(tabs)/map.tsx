import { useCallback, useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "@/lib/i18n";
import { loadLastDiscover } from "@/lib/discover-cache";
import { getApiBaseUrl } from "@/lib/api";
import { formatDistanceKm } from "@/lib/distance";
import type { AppColors } from "@/constants/Colors";
import { useColors } from "@/lib/theme";
import { DestinationCard } from "@/components/DestinationCard";
import type { DiscoverResultDto } from "@/lib/types";

export default function MapNearbyScreen() {
  const { t, translateCondition, locale } = useI18n();

  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [result, setResult] = useState<DiscoverResultDto | null>(null);
  const [loading, setLoading] = useState(true);
  const apiReady = Boolean(getApiBaseUrl());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cached = await loadLastDiscover();
      setResult(cached);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, 12) + 8 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => void load()}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={styles.title}>{t("map.nearbyIdeal")}</Text>
      <Text style={styles.sub}>{t("mobile.mapNearbyHint")}</Text>

      {!apiReady && (
        <Text style={styles.error}>{t("mobile.apiMissing")}</Text>
      )}

      {loading && !result ? (
        <ActivityIndicator color={colors.primary} />
      ) : null}

      {!loading && !result && (
        <View style={styles.emptyBox}>
          <FontAwesome name="map-o" size={32} color={colors.outline} />
          <Text style={styles.empty}>{t("mobile.mapNearbyEmpty")}</Text>
        </View>
      )}

      {result && (
        <View style={styles.results}>
          <Text style={styles.meta}>
            {result.origin.placeName} · {result.dateRangeLabel} ·{" "}
            {t("home.withinOf", {
              radius: formatDistanceKm(result.radiusKm, locale),
              place: result.origin.placeName,
            })}
          </Text>

          {(result.originCurrent || result.originForecast) && (
            <View style={styles.originRow}>
              {result.originCurrent && (
                <Text style={styles.originChip}>
                  {t("home.nowIn", { name: result.origin.name })} ·{" "}
                  {Math.round(result.originCurrent.temperatureC)}°C ·{" "}
                  {translateCondition(result.originCurrent.condition)}
                </Text>
              )}
            </View>
          )}

          {result.destinations.length === 0 ? (
            <Text style={styles.empty}>{t("home.noDestinations")}</Text>
          ) : (
            result.destinations.map((dest) => (
              <DestinationCard key={dest.id} destination={dest} />
            ))
          )}

          <Pressable onPress={() => void load()} style={styles.refreshBtn}>
            <Text style={styles.refreshText}>{t("mobile.pullToRefresh")}</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 48, gap: 12 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.onSurface,
  },
  sub: {
    fontSize: 15,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
  },
  error: { color: colors.error, fontWeight: "600" },
  emptyBox: {
    marginTop: 32,
    alignItems: "center",
    gap: 12,
    padding: 24,
  },
  empty: {
    color: colors.onSurfaceVariant,
    textAlign: "center",
    lineHeight: 22,
  },
  results: { gap: 14, marginTop: 8 },
  meta: { color: colors.onSurfaceVariant, lineHeight: 20 },
  originRow: { gap: 8 },
  originChip: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurface,
    backgroundColor: colors.surfaceLowest,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    overflow: "hidden",
  },
  refreshBtn: { alignItems: "center", padding: 12 },
  refreshText: { color: colors.secondary, fontWeight: "600" },
});
}
