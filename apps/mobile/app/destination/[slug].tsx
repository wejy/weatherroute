import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useI18n } from "@/lib/i18n";
import { apiGet } from "@/lib/api";
import { colors } from "@/constants/Colors";
import type { WeatherDto } from "@/lib/types";

export default function DestinationScreen() {
  const { slug, lat, lon, name } = useLocalSearchParams<{
    slug: string;
    lat?: string;
    lon?: string;
    name?: string;
  }>();
  const { t, translateCondition } = useI18n();
  const [weather, setWeather] = useState<WeatherDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!lat || !lon) {
      setError(t("mobile.errorGeneric"));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<WeatherDto>("/api/weather", {
        lat,
        lon,
        name: name ?? String(slug).replace(/-/g, " "),
      });
      setWeather(data);
    } catch {
      setError(t("mobile.errorGeneric"));
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }, [lat, lon, name, slug, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <Stack.Screen
        options={{
          title: weather?.place.name ?? t("destination.forecast"),
        }}
      />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {loading && <ActivityIndicator color={colors.primary} />}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={load} style={styles.retry}>
              <Text style={styles.retryText}>{t("mobile.retry")}</Text>
            </Pressable>
          </View>
        )}
        {weather && (
          <>
            <Text style={styles.place}>{weather.place.placeName}</Text>
            <Text style={styles.section}>
              {t("destination.currentConditions")}
            </Text>
            <View style={styles.hero}>
              <Text style={styles.temp}>
                {Math.round(weather.current.temperatureC)}°C
              </Text>
              <Text style={styles.condition}>
                {translateCondition(weather.current.condition)}
              </Text>
              <Text style={styles.feels}>
                {t("destination.feelsLike", {
                  temp: Math.round(weather.current.feelsLikeC),
                })}
              </Text>
            </View>

            <View style={styles.grid}>
              <Metric
                label={t("destination.wind")}
                value={`${Math.round(weather.current.windSpeedKmh)} km/h`}
              />
              <Metric
                label={t("destination.humidity")}
                value={`${weather.current.humidity}%`}
              />
              <Metric
                label={t("destination.visibility")}
                value={`${weather.current.visibilityKm} km`}
              />
              <Metric
                label={t("destination.uvIndex")}
                value={`${weather.current.uvIndex} · ${weather.current.uvLabel}`}
              />
            </View>

            <Text style={styles.section}>{t("destination.forecast")}</Text>
            {weather.daily.slice(0, 7).map((day) => (
              <View key={day.date} style={styles.dayRow}>
                <Text style={styles.dayLabel}>{day.dayLabel}</Text>
                <Text style={styles.dayCond}>
                  {translateCondition(day.condition)}
                </Text>
                <Text style={styles.dayTemp}>
                  {Math.round(day.tempMinC)}–{Math.round(day.tempMaxC)}°
                </Text>
                <Text style={styles.dayRain}>
                  {t("destination.rainPct", {
                    pct: day.precipitationProbability,
                  })}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  place: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.onSurface,
  },
  section: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
  },
  hero: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 4,
  },
  temp: { fontSize: 40, fontWeight: "800", color: colors.primary },
  condition: { fontSize: 18, fontWeight: "600", color: colors.onSurface },
  feels: { color: colors.onSurfaceVariant },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: {
    width: "48%",
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    padding: 12,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
  },
  metricValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "700",
    color: colors.onSurface,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  dayLabel: { width: 72, fontWeight: "700", color: colors.onSurface },
  dayCond: { flex: 1, color: colors.onSurfaceVariant },
  dayTemp: { fontWeight: "700", color: colors.onSurface },
  dayRain: { width: 72, textAlign: "right", color: colors.secondary },
  errorBox: { gap: 12 },
  error: { color: colors.error, fontWeight: "600" },
  retry: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { color: colors.onPrimary, fontWeight: "700" },
});
