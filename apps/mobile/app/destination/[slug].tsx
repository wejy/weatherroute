import { useCallback, useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { useI18n } from "@/lib/i18n";
import { apiGet } from "@/lib/api";
import type { AppColors } from "@/constants/Colors";
import { useColors } from "@/lib/theme";
import type { WeatherDto } from "@/lib/types";

type WikipediaSummary = {
  title: string;
  extract: string;
  description?: string;
  thumbnailUrl?: string;
  pageUrl: string;
  lang: string;
};

export default function DestinationScreen() {
  const { slug, lat, lon, name, startDate, endDate, datePreset } =
    useLocalSearchParams<{
      slug: string;
      lat?: string;
      lon?: string;
      name?: string;
      startDate?: string;
      endDate?: string;
      datePreset?: string;
    }>();
  const { t, translateCondition, translateUv, locale } = useI18n();

  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [weather, setWeather] = useState<WeatherDto | null>(null);
  const [wikipedia, setWikipedia] = useState<WikipediaSummary | null>(null);
  const [wikiLoading, setWikiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const placeName = name ?? String(slug).replace(/-/g, " ");

  const loadWikipedia = useCallback(async () => {
    if (!lat || !lon) return;
    setWikiLoading(true);
    try {
      const data = await apiGet<{ summary: WikipediaSummary | null }>(
        "/api/wikipedia",
        {
          name: placeName,
          lat,
          lon,
          lang: locale,
          placeId: String(slug),
        },
      );
      setWikipedia(data.summary);
    } catch {
      setWikipedia(null);
    } finally {
      setWikiLoading(false);
    }
  }, [lat, lon, locale, placeName, slug]);

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
        name: placeName,
        lang: locale,
        datePreset:
          datePreset === "today" ||
          datePreset === "tomorrow" ||
          datePreset === "weekend" ||
          datePreset === "custom"
            ? datePreset
            : startDate
              ? "custom"
              : "weekend",
        startDate: startDate || undefined,
        endDate: endDate || startDate || undefined,
      });
      setWeather(data);
    } catch {
      setError(t("mobile.errorGeneric"));
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }, [lat, lon, locale, placeName, t, startDate, endDate, datePreset]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadWikipedia();
  }, [loadWikipedia]);

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
                value={`${weather.current.uvIndex} · ${translateUv(weather.current.uvIndex)}`}
              />
            </View>

            {weather.suitability && weather.suitability.length > 0 ? (
              <>
                <Text style={styles.section}>
                  {t("destination.tripSuitability")}
                </Text>
                {weather.suitability.map((badge) => (
                  <View
                    key={badge.id}
                    style={[
                      styles.badge,
                      badge.tone === "warning"
                        ? styles.badgeWarn
                        : badge.tone === "success"
                          ? styles.badgeOk
                          : styles.badgeInfo,
                    ]}
                  >
                    <Text style={styles.badgeTitle}>{badge.title}</Text>
                    <Text style={styles.badgeDesc}>{badge.description}</Text>
                  </View>
                ))}
              </>
            ) : null}

            <Text style={styles.section}>{t("destination.forecast")}</Text>
            <Text style={styles.hint}>{t("destination.precipPeakNote")}</Text>
            {weather.daily.slice(0, 7).map((day) => (
              <View key={day.date} style={styles.dayRow}>
                <Text style={styles.dayLabel}>{day.dayLabel}</Text>
                <Text style={styles.dayCond}>
                  {translateCondition(day.condition)}
                </Text>
                <Text style={styles.dayTemp}>
                  {Math.round(day.tempMinC)}–{Math.round(day.tempMaxC)}°
                </Text>
                <View style={styles.dayPrecip}>
                  {day.precipitationMm != null ? (
                    <Text style={styles.dayRain}>
                      {t("destination.rainMm", {
                        mm: Math.round(day.precipitationMm * 10) / 10,
                      })}
                    </Text>
                  ) : null}
                  <Text
                    style={
                      day.precipitationMm != null
                        ? styles.dayChance
                        : styles.dayRain
                    }
                  >
                    {t("destination.rainPct", {
                      pct: day.precipitationProbability,
                    })}
                  </Text>
                </View>
              </View>
            ))}

            {weather.hourly && weather.hourly.length > 0 ? (
              <>
                <Text style={styles.section}>
                  {t("destination.precipHourly")}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hourlyRow}
                >
                  {weather.hourly.slice(0, 24).map((h) => {
                    const hour = h.time.match(/T(\d{2})/)?.[1] ?? "--";
                    return (
                      <View key={h.time} style={styles.hourCard}>
                        <Text style={styles.hourLabel}>{hour}:00</Text>
                        {h.precipitationMm != null ? (
                          <Text style={styles.hourRain}>
                            {Math.round(h.precipitationMm * 10) / 10} mm
                          </Text>
                        ) : null}
                        <Text
                          style={
                            h.precipitationMm != null
                              ? styles.hourChance
                              : styles.hourRain
                          }
                        >
                          {h.precipitationProbability}%
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}

            <Text style={styles.section}>
              {t("destination.wikipediaTitle", { place: placeName })}
            </Text>
            {wikiLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : wikipedia ? (
              <View style={styles.wikiCard}>
                {wikipedia.thumbnailUrl ? (
                  <Image
                    source={{ uri: wikipedia.thumbnailUrl }}
                    style={styles.wikiImage}
                    contentFit="cover"
                  />
                ) : null}
                {wikipedia.description ? (
                  <Text style={styles.wikiDescription}>
                    {wikipedia.description}
                  </Text>
                ) : null}
                <Text style={styles.wikiExtract}>{wikipedia.extract}</Text>
                <Pressable
                  onPress={() => void Linking.openURL(wikipedia.pageUrl)}
                  style={styles.wikiLink}
                >
                  <Text style={styles.wikiLinkText}>
                    {t("destination.wikipediaLink")}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.wikiUnavailable}>
                {t("destination.wikipediaUnavailable")}
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
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
  hint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
    marginTop: -4,
  },
  hourlyRow: { gap: 8, paddingVertical: 4 },
  hourCard: {
    width: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLowest,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 4,
  },
  hourLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },
  hourRain: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.secondary,
  },
  hourChance: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
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
  badge: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  badgeOk: {
    borderColor: "rgba(20, 184, 99, 0.35)",
    backgroundColor: "rgba(20, 184, 99, 0.08)",
  },
  badgeInfo: {
    borderColor: "rgba(0, 101, 145, 0.3)",
    backgroundColor: "rgba(0, 101, 145, 0.06)",
  },
  badgeWarn: {
    borderColor: "rgba(186, 26, 26, 0.35)",
    backgroundColor: "rgba(186, 26, 26, 0.08)",
  },
  badgeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurface,
  },
  badgeDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
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
  dayPrecip: { minWidth: 72, alignItems: "flex-end", gap: 2 },
  dayRain: {
    fontWeight: "700",
    color: colors.secondary,
    textAlign: "right",
  },
  dayChance: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: "right",
  },
  wikiCard: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  wikiImage: {
    width: "100%",
    height: 160,
    borderRadius: 12,
  },
  wikiDescription: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  wikiExtract: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurfaceVariant,
  },
  wikiLink: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surfaceContainer,
  },
  wikiLinkText: {
    fontWeight: "700",
    color: colors.onSurface,
  },
  wikiUnavailable: {
    color: colors.onSurfaceVariant,
    fontSize: 14,
  },
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
}
