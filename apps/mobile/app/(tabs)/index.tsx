import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "@/lib/i18n";
import { apiGet, getApiBaseUrl } from "@/lib/api";
import {
  detectCoarsePlace,
  detectCurrentPlace,
  LocationDetectError,
} from "@/lib/location";
import {
  CUSTOM_RADIUS_DEFAULT_KM,
  CUSTOM_RADIUS_MAX_KM,
  CUSTOM_RADIUS_MIN_KM,
  DISTANCE_PRESET_KEYS,
  resolveRadiusKm,
} from "@/lib/distance";
import { colors } from "@/constants/Colors";
import { DestinationCard } from "@/components/DestinationCard";
import type { DiscoverResultDto, PlaceDto, WeatherGoal } from "@/lib/types";

const GOALS: WeatherGoal[] = ["sun", "dry", "mild", "warm"];
const DATE_PRESETS = ["today", "tomorrow", "weekend"] as const;
type DatePreset = (typeof DATE_PRESETS)[number];
type DistanceOption = (typeof DISTANCE_PRESET_KEYS)[number] | "custom";

export default function DiscoverScreen() {
  const { t, translateCondition } = useI18n();
  const insets = useSafeAreaInsets();
  const autoStarted = useRef(false);

  const [originQuery, setOriginQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<PlaceDto | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceDto[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locatingMode, setLocatingMode] = useState<"coarse" | "precise" | null>(
    null,
  );
  const [coarseHint, setCoarseHint] = useState(false);
  const [goal, setGoal] = useState<WeatherGoal>("sun");
  const [datePreset, setDatePreset] = useState<DatePreset>("weekend");
  const [distance, setDistance] = useState<DistanceOption>("region");
  const [customRadiusKm, setCustomRadiusKm] = useState(CUSTOM_RADIUS_DEFAULT_KM);
  const [result, setResult] = useState<DiscoverResultDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiReady = Boolean(getApiBaseUrl());

  const runDiscover = useCallback(
    async (
      place: PlaceDto,
      weatherGoal: WeatherGoal,
      opts?: {
        datePreset?: DatePreset;
        distance?: DistanceOption;
        radiusKm?: number;
      },
    ) => {
      const nextDistance = opts?.distance ?? distance;
      const nextPreset = opts?.datePreset ?? datePreset;
      const nextRadius = opts?.radiusKm ?? customRadiusKm;
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet<DiscoverResultDto>("/api/discover", {
          origin: place.placeName,
          lat: place.lat,
          lon: place.lon,
          weatherGoal,
          distance: nextDistance,
          radiusKm:
            nextDistance === "custom"
              ? resolveRadiusKm("custom", nextRadius)
              : undefined,
          datePreset: nextPreset,
        });
        setResult(data);
      } catch (e) {
        const message =
          e instanceof Error && e.message === "MISSING_API_URL"
            ? t("mobile.apiMissing")
            : e instanceof Error && e.message === "NETWORK"
              ? t("mobile.networkError")
              : t("mobile.errorGeneric");
        setError(message);
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [customRadiusKm, datePreset, distance, t],
  );

  const searchPlaces = useCallback(
    async (q: string) => {
      if (q.trim().length < 2 || !apiReady) {
        setSuggestions([]);
        setSearchingPlaces(false);
        return;
      }
      setSearchingPlaces(true);
      try {
        const data = await apiGet<{ results?: PlaceDto[] }>("/api/search", {
          q,
          limit: 6,
        });
        setSuggestions(data.results?.slice(0, 6) ?? []);
      } catch {
        setSuggestions([]);
      } finally {
        setSearchingPlaces(false);
      }
    },
    [apiReady],
  );

  useEffect(() => {
    const id = setTimeout(() => {
      if (!selectedPlace || originQuery !== selectedPlace.placeName) {
        void searchPlaces(originQuery);
      }
    }, 280);
    return () => clearTimeout(id);
  }, [originQuery, searchPlaces, selectedPlace]);

  const applyPlace = useCallback(
    async (
      place: PlaceDto,
      opts?: {
        distance?: DistanceOption;
        andSearch?: boolean;
      },
    ) => {
      setSelectedPlace(place);
      setOriginQuery(place.placeName);
      setSuggestions([]);
      if (opts?.distance) setDistance(opts.distance);
      if (opts?.andSearch !== false) {
        await runDiscover(place, goal, {
          distance: opts?.distance,
        });
      }
    },
    [goal, runDiscover],
  );

  const locateCoarse = useCallback(async () => {
    if (!apiReady) {
      setError(t("mobile.apiMissing"));
      return;
    }
    setLocating(true);
    setLocatingMode("coarse");
    setError(null);
    try {
      const coarse = await detectCoarsePlace();
      setCoarseHint(true);
      await applyPlace(coarse.place, {
        distance: coarse.suggestedDistance,
        andSearch: true,
      });
    } catch {
      setError(t("location.failed"));
      setCoarseHint(false);
    } finally {
      setLocating(false);
      setLocatingMode(null);
    }
  }, [apiReady, applyPlace, t]);

  const locatePrecise = useCallback(async () => {
    if (!apiReady) {
      setError(t("mobile.apiMissing"));
      return;
    }
    setLocating(true);
    setLocatingMode("precise");
    setError(null);
    try {
      const place = await detectCurrentPlace();
      setCoarseHint(false);
      await applyPlace(place, { andSearch: true });
    } catch (e) {
      if (e instanceof LocationDetectError) {
        if (e.code === "denied") setError(t("location.denied"));
        else setError(t("location.failed"));
      } else {
        setError(t("location.failed"));
      }
    } finally {
      setLocating(false);
      setLocatingMode(null);
    }
  }, [apiReady, applyPlace, t]);

  useEffect(() => {
    if (!apiReady || autoStarted.current) return;
    autoStarted.current = true;
    void locateCoarse();
  }, [apiReady, locateCoarse]);

  function selectPlace(place: PlaceDto) {
    setCoarseHint(false);
    setSelectedPlace(place);
    setOriginQuery(place.placeName);
    setSuggestions([]);
    void runDiscover(place, goal);
  }

  function onSearch() {
    if (selectedPlace) {
      void runDiscover(selectedPlace, goal);
      return;
    }
    if (originQuery.trim().length >= 2) {
      void (async () => {
        try {
          const data = await apiGet<{ results?: PlaceDto[] }>("/api/search", {
            q: originQuery.trim(),
            limit: 1,
          });
          const first = data.results?.[0];
          if (!first) {
            setError(t("search.placeNotFound"));
            return;
          }
          selectPlace(first);
        } catch {
          setError(t("search.placeNotFound"));
        }
      })();
      return;
    }
    setError(t("search.chooseOrigin"));
  }

  const distanceOptions: DistanceOption[] = [
    ...DISTANCE_PRESET_KEYS,
    "custom",
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, 12) + 8 },
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => {
            if (selectedPlace) void runDiscover(selectedPlace, goal);
            else void locateCoarse();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={styles.brand}>{t("brand")}</Text>
      <Text style={styles.headline}>
        {t("home.headline")}
        {"\n"}
        {t("home.headlineBreak")}
      </Text>
      <Text style={styles.subhead}>{t("home.subhead")}</Text>

      {!apiReady && (
        <View style={styles.banner} accessibilityRole="alert">
          <Text style={styles.bannerText}>{t("mobile.apiMissing")}</Text>
          <Text style={styles.bannerHint}>{t("mobile.openWebHint")}</Text>
        </View>
      )}

      <View style={styles.panel}>
        <Text style={styles.label}>{t("search.whereFrom")}</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={originQuery}
            onChangeText={(v) => {
              setOriginQuery(v);
              setSelectedPlace(null);
              setCoarseHint(false);
            }}
            placeholder={
              locatingMode === "precise"
                ? t("location.detecting")
                : locatingMode === "coarse"
                  ? t("location.detectingCoarse")
                  : t("location.placeholder")
            }
            placeholderTextColor={colors.outline}
            accessibilityLabel={t("location.placeholder")}
            style={styles.input}
            autoCorrect={false}
            editable={!locating}
          />
          <Pressable
            onPress={() => void locatePrecise()}
            disabled={locating || !apiReady}
            accessibilityLabel={t("location.useMyLocation")}
            style={[styles.geoBtn, locating && styles.disabled]}
          >
            {locating ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <FontAwesome name="location-arrow" size={18} color={colors.primary} />
            )}
          </Pressable>
        </View>

        {(searchingPlaces || suggestions.length > 0) && (
          <View style={styles.suggestions}>
            {searchingPlaces && suggestions.length === 0 ? (
              <Text style={styles.suggestionHint}>{t("search.searching")}</Text>
            ) : (
              suggestions.map((place) => (
                <Pressable
                  key={place.id}
                  onPress={() => selectPlace(place)}
                  style={styles.suggestion}
                >
                  <FontAwesome
                    name="map-marker"
                    size={14}
                    color={colors.secondary}
                    style={{ marginTop: 2 }}
                  />
                  <Text style={styles.suggestionText}>{place.placeName}</Text>
                </Pressable>
              ))
            )}
          </View>
        )}

        <Text style={styles.label}>{t("search.whenGoing")}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {DATE_PRESETS.map((preset) => {
            const active = datePreset === preset;
            return (
              <Pressable
                key={preset}
                onPress={() => {
                  setDatePreset(preset);
                  if (selectedPlace) {
                    void runDiscover(selectedPlace, goal, {
                      datePreset: preset,
                    });
                  }
                }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {t(`dates.${preset}`)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>{t("search.howFar")}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {distanceOptions.map((key) => {
            const active = distance === key;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  setDistance(key);
                  if (selectedPlace) {
                    void runDiscover(selectedPlace, goal, { distance: key });
                  }
                }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {t(`search.distances.${key}`)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {distance === "custom" && (
          <View style={styles.customRadius}>
            <Text style={styles.customRadiusLabel}>
              {t("search.customRadius")} · {customRadiusKm} km
            </Text>
            <TextInput
              value={String(customRadiusKm)}
              keyboardType="number-pad"
              onChangeText={(v) => {
                const n = Number(v.replace(/\D/g, ""));
                if (Number.isNaN(n)) return;
                const clamped = Math.min(
                  CUSTOM_RADIUS_MAX_KM,
                  Math.max(CUSTOM_RADIUS_MIN_KM, n),
                );
                setCustomRadiusKm(clamped);
              }}
              onEndEditing={() => {
                if (selectedPlace) {
                  void runDiscover(selectedPlace, goal, {
                    distance: "custom",
                    radiusKm: customRadiusKm,
                  });
                }
              }}
              style={styles.radiusInput}
              accessibilityLabel={t("search.customRadius")}
            />
            <Text style={styles.hint}>{t("search.customRadiusHint")}</Text>
          </View>
        )}

        <Text style={styles.label}>{t("search.weatherGoal")}</Text>
        <View style={styles.goals}>
          {GOALS.map((g) => {
            const active = goal === g;
            return (
              <Pressable
                key={g}
                onPress={() => {
                  setGoal(g);
                  if (selectedPlace) void runDiscover(selectedPlace, g);
                }}
                accessibilityState={{ selected: active }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {t(`search.goals.${g}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={onSearch}
          disabled={loading || locating || !apiReady}
          accessibilityRole="button"
          accessibilityLabel={t("a11y.searchDestinations")}
          style={[
            styles.searchBtn,
            (loading || locating || !apiReady) && styles.disabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <FontAwesome name="search" size={16} color={colors.onPrimary} />
              <Text style={styles.searchBtnText}>{t("search.search")}</Text>
            </>
          )}
        </Pressable>
      </View>

      {coarseHint && !error && (
        <Text style={styles.status}>{t("location.coarseHint")}</Text>
      )}

      {error && (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}

      {locating && !result && (
        <Text style={styles.status}>
          {locatingMode === "precise"
            ? t("location.detecting")
            : t("location.detectingCoarse")}
        </Text>
      )}

      {result && (
        <View style={styles.results}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>
              {t("home.bestWeather")} · {result.dateLabel}
            </Text>
            <Text style={styles.resultsMeta}>
              {result.dateRangeLabel} ·{" "}
              {t("home.withinOf", {
                radius: result.radiusKm,
                place: result.origin.placeName,
              })}
              {result.destinations.length > 0
                ? ` · ${t("home.places", { count: result.destinations.length })}`
                : ""}
            </Text>

            {(result.originCurrent || result.originForecast) && (
              <View style={styles.originChips}>
                {result.originCurrent && (
                  <View style={styles.originChip}>
                    <Text style={styles.originChipLabel}>
                      {t("home.nowIn", { name: result.origin.name })}
                    </Text>
                    <Text style={styles.originChipValue}>
                      {Math.round(result.originCurrent.temperatureC)}°C ·{" "}
                      {translateCondition(result.originCurrent.condition)}
                    </Text>
                  </View>
                )}
                {result.originForecast && (
                  <View style={[styles.originChip, styles.originChipForecast]}>
                    <Text
                      style={[styles.originChipLabel, styles.originChipForecastLabel]}
                    >
                      {t("home.forecastIn", {
                        label: result.dateLabel,
                        name: result.origin.name,
                      })}
                    </Text>
                    <Text style={styles.originChipValue}>
                      {Math.round(result.originForecast.tempMinC)}–
                      {Math.round(result.originForecast.tempMaxC)}°C ·{" "}
                      {translateCondition(result.originForecast.condition)}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {result.destinations.length === 0 ? (
            <Text style={styles.empty}>{t("home.noDestinations")}</Text>
          ) : (
            result.destinations.map((dest) => (
              <DestinationCard key={dest.id} destination={dest} />
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 48, gap: 14 },
  brand: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.primary,
  },
  headline: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.onSurface,
    lineHeight: 34,
  },
  subhead: {
    fontSize: 16,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: 4,
  },
  banner: {
    backgroundColor: "rgba(186, 26, 26, 0.08)",
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  bannerText: { color: colors.error, fontWeight: "600" },
  bannerHint: { color: colors.onSurfaceVariant, fontSize: 13 },
  panel: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  label: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
  },
  inputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 14,
    fontSize: 17,
    fontWeight: "600",
    color: colors.onSurface,
  },
  geoBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestions: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLowest,
    overflow: "hidden",
  },
  suggestion: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  suggestionText: { flex: 1, color: colors.onSurface, fontSize: 15 },
  suggestionHint: {
    padding: 12,
    color: colors.onSurfaceVariant,
    fontSize: 14,
  },
  chipRow: { gap: 8, paddingVertical: 2 },
  goals: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { fontWeight: "600", color: colors.onSurface, fontSize: 13 },
  chipTextActive: { color: colors.onPrimary },
  customRadius: { gap: 6 },
  customRadiusLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurface,
  },
  radiusInput: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.onSurface,
  },
  hint: { fontSize: 12, color: colors.onSurfaceVariant },
  searchBtn: {
    marginTop: 8,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  searchBtnText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  disabled: { opacity: 0.55 },
  error: { color: colors.error, fontWeight: "600" },
  status: { color: colors.onSurfaceVariant },
  results: { marginTop: 8, gap: 14 },
  resultsHeader: {
    backgroundColor: "rgba(252, 248, 255, 0.95)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.onSurface,
  },
  resultsMeta: { color: colors.onSurfaceVariant, lineHeight: 20 },
  originChips: { gap: 8, marginTop: 4 },
  originChip: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLowest,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  originChipForecast: {
    backgroundColor: "rgba(0, 101, 145, 0.08)",
    borderColor: "rgba(0, 101, 145, 0.2)",
  },
  originChipLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
  },
  originChipForecastLabel: { color: colors.secondary },
  originChipValue: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: "700",
    color: colors.onSurface,
  },
  empty: { color: colors.onSurfaceVariant, paddingVertical: 8 },
});
