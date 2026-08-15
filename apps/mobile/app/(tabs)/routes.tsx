import { useCallback, useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, useLocalSearchParams, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "@/lib/i18n";
import { apiGet, apiPost, getApiBaseUrl, ApiError, type PublicQuota } from "@/lib/api";
import { formatDistanceKm } from "@/lib/distance";
import {
  DEPARTURE_HOURS,
  formatHourOption,
  normalizeDepartureWindow,
  parseDepartureHourParam,
} from "@/lib/departure";
import {
  appleMapsDirectionsUrl,
  googleMapsDirectionsUrl,
  weatherTripRouteShareUrl,
} from "@/lib/route-share";
import { SoftPaywall } from "@/components/SoftPaywall";
import { RoutePolylinePreview } from "@/components/RoutePolylinePreview";
import {
  clampDateKey,
  isDateKey,
  maxForecastDateKey,
  minForecastDateKey,
  resolveDateWindow,
  type DatePreset,
  type DateWindow,
} from "@/lib/dates";
import type { AppColors } from "@/constants/Colors";
import { useColors } from "@/lib/theme";
import { PlaceAutocomplete } from "@/components/PlaceAutocomplete";
import {
  detectCurrentPlace,
  LocationDetectError,
} from "@/lib/location";
import type {
  PlaceDto,
  RouteAlternativeDto,
  RouteDto,
  TravelMode,
} from "@/lib/types";
import { isTravelMode } from "@/lib/types";
import { fetchSession, type DiscoverTier } from "@/lib/session";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("routes");

const DATE_PRESETS: DatePreset[] = ["today", "tomorrow", "weekend", "custom"];
const TRAVEL_MODES: TravelMode[] = ["driving", "cycling"];

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function alternativeTitle(
  alt: RouteAlternativeDto,
  t: (key: string) => string,
): string {
  if (alt.isFastest && alt.isDriest) return t("routes.alternativeBoth");
  if (alt.isFastest) return t("routes.alternativeFastest");
  if (alt.isDriest) return t("routes.alternativeDriest");
  return t("routes.alternativeOtherRoute");
}

export default function RoutesScreen() {
  const { t, translateCondition, locale } = useI18n();
  const params = useLocalSearchParams<{
    from?: string | string[];
    to?: string | string[];
    fromLat?: string | string[];
    fromLon?: string | string[];
    toLat?: string | string[];
    toLon?: string | string[];
    mode?: string | string[];
    datePreset?: string | string[];
    startDate?: string | string[];
    endDate?: string | string[];
    departureStartHour?: string | string[];
    departureEndHour?: string | string[];
  }>();

  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const minDate = minForecastDateKey();
  const maxDate = maxForecastDateKey();
  const apiReady = Boolean(getApiBaseUrl());

  const initialFrom = firstParam(params.from) ?? "";
  const initialTo = firstParam(params.to) ?? "";
  const initialModeRaw = firstParam(params.mode);
  const initialMode = isTravelMode(initialModeRaw) ? initialModeRaw : "driving";
  const initialPresetRaw = firstParam(params.datePreset);
  const initialPreset: DatePreset =
    initialPresetRaw === "today" ||
    initialPresetRaw === "tomorrow" ||
    initialPresetRaw === "weekend" ||
    initialPresetRaw === "custom"
      ? initialPresetRaw
      : "weekend";
  const initialStart = firstParam(params.startDate);
  const initialEnd = firstParam(params.endDate);

  const [fromQuery, setFromQuery] = useState(initialFrom);
  const [toQuery, setToQuery] = useState(initialTo);
  const [fromPlace, setFromPlace] = useState<PlaceDto | null>(() => {
    const lat = Number(firstParam(params.fromLat));
    const lon = Number(firstParam(params.fromLon));
    if (!initialFrom || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return null;
    }
    return {
      id: `saved-from-${lat},${lon}`,
      name: initialFrom,
      placeName: initialFrom,
      lat,
      lon,
    };
  });
  const [toPlace, setToPlace] = useState<PlaceDto | null>(() => {
    const lat = Number(firstParam(params.toLat));
    const lon = Number(firstParam(params.toLon));
    if (!initialTo || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return null;
    }
    return {
      id: `saved-to-${lat},${lon}`,
      name: initialTo,
      placeName: initialTo,
      lat,
      lon,
    };
  });
  const [locatingFrom, setLocatingFrom] = useState(false);
  const [mode, setMode] = useState<TravelMode>(initialMode);
  const [dateWindow, setDateWindow] = useState<DateWindow>(() =>
    resolveDateWindow({
      preset: initialPreset,
      startDate: initialStart && isDateKey(initialStart) ? initialStart : undefined,
      endDate: initialEnd && isDateKey(initialEnd) ? initialEnd : undefined,
      locale,
    }),
  );
  const [departureStartHour, setDepartureStartHour] = useState<number | null>(
    () => parseDepartureHourParam(firstParam(params.departureStartHour)),
  );
  const [departureEndHour, setDepartureEndHour] = useState<number | null>(() =>
    parseDepartureHourParam(firstParam(params.departureEndHour)),
  );
  const [tier, setTier] = useState<DiscoverTier>("anon");
  const [canSaveTrip, setCanSaveTrip] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [route, setRoute] = useState<RouteDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paywalled, setPaywalled] = useState(false);
  const [quota, setQuota] = useState<PublicQuota | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetchSession().then((s) => {
      setTier(s.tier);
      setCanSaveTrip(s.canSaveTrip);
      setSignedIn(Boolean(s.user));
    });
  }, []);

  useEffect(() => {
    setDateWindow((prev) =>
      resolveDateWindow({
        preset: prev.preset,
        startDate: prev.startDate,
        endDate: prev.endDate,
        locale,
      }),
    );
  }, [locale]);

  const isPro = tier === "pro";

  const locateFrom = useCallback(async () => {
    if (!apiReady) {
      setError(t("mobile.apiMissing"));
      return;
    }
    setLocatingFrom(true);
    setError(null);
    try {
      const place = await detectCurrentPlace(t("mobile.here"), locale);
      setFromPlace(place);
      setFromQuery(place.placeName);
    } catch (e) {
      if (e instanceof LocationDetectError && e.code === "denied") {
        setError(t("location.denied"));
      } else {
        setError(t("location.failed"));
      }
    } finally {
      setLocatingFrom(false);
    }
  }, [apiReady, locale, t]);

  const loadRoute = useCallback(
    async (opts?: {
      alt?: number;
      window?: DateWindow;
      travelMode?: TravelMode;
      startHour?: number | null;
      endHour?: number | null;
    }) => {
      if (!apiReady) {
        setError(t("mobile.apiMissing"));
        return;
      }
      if (!fromPlace || !toPlace) {
        setError(t("routes.pickBoth"));
        return;
      }
      const nextWindow = opts?.window ?? dateWindow;
      const nextMode = opts?.travelMode ?? mode;
      const nextStart =
        opts && "startHour" in opts ? opts.startHour : departureStartHour;
      const nextEnd =
        opts && "endHour" in opts ? opts.endHour : departureEndHour;
      const normalized = normalizeDepartureWindow(
        nextStart ?? null,
        nextEnd ?? null,
      );
      if (!normalized.ok) {
        setError(t("routes.departureWindowInvalid"));
        return;
      }
      setLoading(true);
      setError(null);
      setPaywalled(false);
      setQuota(null);
      try {
        log.info(
          {
            from: fromPlace.name,
            to: toPlace.name,
            mode: nextMode,
          },
          "route start",
        );
        const data = await apiGet<RouteDto>("/api/routes", {
          from: fromPlace.placeName,
          to: toPlace.placeName,
          fromLat: fromPlace.lat,
          fromLon: fromPlace.lon,
          toLat: toPlace.lat,
          toLon: toPlace.lon,
          mode: nextMode,
          prefer: "weather",
          datePreset: nextWindow.preset,
          startDate: nextWindow.startDate,
          endDate: nextWindow.endDate,
          alt: opts?.alt,
          lang: locale,
          departureStartHour:
            isPro && normalized.window.startHour != null
              ? normalized.window.startHour
              : undefined,
          departureEndHour:
            isPro && normalized.window.endHour != null
              ? normalized.window.endHour
              : undefined,
        });
        setRoute(data);
        log.info(
          {
            from: fromPlace.name,
            to: toPlace.name,
            waypoints: data.waypoints?.length ?? 0,
          },
          "route ok",
        );
      } catch (e) {
        if (e instanceof ApiError && e.isPaywall) {
          setPaywalled(true);
          setQuota(e.quota);
          setRoute(null);
          setError(null);
        } else {
          log.warn({ err: e }, "route failed");
          const message =
            e instanceof Error && e.message === "NETWORK"
              ? t("mobile.networkError")
              : e instanceof ApiError && e.isServiceUnavailable
                ? t("mobile.serviceUnavailable")
                : t("mobile.errorGeneric");
          setError(message);
          setRoute(null);
        }
      } finally {
        setLoading(false);
      }
    },
    [
      apiReady,
      dateWindow,
      departureEndHour,
      departureStartHour,
      fromPlace,
      isPro,
      locale,
      mode,
      t,
      toPlace,
    ],
  );

  const sortedAlts = route?.alternatives
    ? [...route.alternatives].sort(
        (a, b) =>
          Number(b.isFastest) - Number(a.isFastest) ||
          Number(b.isDriest) - Number(a.isDriest) ||
          a.durationMinutes - b.durationMinutes,
      )
    : [];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, 12) + 8 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.brand}>{t("nav.routes")}</Text>
      <Text style={styles.subhead}>{t("routes.conditions")}</Text>

      {!apiReady && (
        <View style={styles.banner} accessibilityRole="alert">
          <Text style={styles.bannerText}>{t("mobile.apiMissing")}</Text>
          <Text style={styles.bannerHint}>{t("mobile.openWebHint")}</Text>
        </View>
      )}

      <View style={styles.panel}>
        <Text style={styles.label}>{t("routes.from")}</Text>
        <PlaceAutocomplete
          value={fromQuery}
          onChange={setFromQuery}
          onPlaceSelect={setFromPlace}
          placeholder={
            locatingFrom
              ? t("location.detecting")
              : t("routes.fromPlaceholder")
          }
          selected={Boolean(fromPlace)}
          proximity={
            fromPlace
              ? { lat: fromPlace.lat, lon: fromPlace.lon }
              : toPlace
                ? { lat: toPlace.lat, lon: toPlace.lon }
                : null
          }
          editable={apiReady && !locatingFrom}
          trailing={
            <Pressable
              onPress={() => void locateFrom()}
              disabled={locatingFrom || !apiReady}
              accessibilityLabel={t("location.useMyLocation")}
              style={[styles.geoBtn, locatingFrom && styles.disabled]}
            >
              {locatingFrom ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <FontAwesome
                  name="location-arrow"
                  size={18}
                  color={colors.primary}
                />
              )}
            </Pressable>
          }
        />

        <Text style={styles.label}>{t("routes.to")}</Text>
        <PlaceAutocomplete
          value={toQuery}
          onChange={setToQuery}
          onPlaceSelect={setToPlace}
          placeholder={t("routes.toPlaceholder")}
          selected={Boolean(toPlace)}
          proximity={
            toPlace
              ? { lat: toPlace.lat, lon: toPlace.lon }
              : fromPlace
                ? { lat: fromPlace.lat, lon: fromPlace.lon }
                : null
          }
          editable={apiReady}
        />

        <Text style={styles.label}>{t("routes.travelMode")}</Text>
        <View style={styles.modeRow}>
          {TRAVEL_MODES.map((m) => {
            const active = mode === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={[styles.modeChip, active && styles.chipActive]}
                accessibilityState={{ selected: active }}
              >
                <FontAwesome
                  name={m === "driving" ? "car" : "bicycle"}
                  size={14}
                  color={active ? colors.onAccent : colors.onSurface}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {m === "driving" ? t("travel.driving") : t("travel.cycling")}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>{t("search.whenGoing")}</Text>
        <Text style={styles.dateRangeHint}>{dateWindow.rangeLabel}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {DATE_PRESETS.map((preset) => {
            const active = dateWindow.preset === preset;
            return (
              <Pressable
                key={preset}
                onPress={() => {
                  setDateWindow(
                    resolveDateWindow({
                      preset,
                      startDate: dateWindow.startDate,
                      endDate: dateWindow.endDate,
                      locale,
                    }),
                  );
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

        {dateWindow.preset === "custom" && (
          <View style={styles.customDates}>
            <View style={styles.customDateField}>
              <Text style={styles.customDateLabel}>{t("dates.start")}</Text>
              <TextInput
                value={dateWindow.startDate}
                onChangeText={(v) => {
                  const raw = v.trim();
                  if (!isDateKey(raw)) {
                    setDateWindow((prev) => ({ ...prev, startDate: raw }));
                    return;
                  }
                  const startDate = clampDateKey(raw, minDate, maxDate);
                  const endDate =
                    dateWindow.endDate < startDate
                      ? startDate
                      : isDateKey(dateWindow.endDate)
                        ? dateWindow.endDate
                        : startDate;
                  setDateWindow(
                    resolveDateWindow({
                      preset: "custom",
                      startDate,
                      endDate,
                      locale,
                    }),
                  );
                }}
                onEndEditing={() => {
                  setDateWindow(
                    resolveDateWindow({
                      preset: "custom",
                      startDate: clampDateKey(
                        dateWindow.startDate,
                        minDate,
                        maxDate,
                      ),
                      endDate: clampDateKey(
                        dateWindow.endDate,
                        minDate,
                        maxDate,
                      ),
                      locale,
                    }),
                  );
                }}
                placeholder={t("mobile.isoDatePlaceholder")}
                placeholderTextColor={colors.outline}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.dateInput}
              />
            </View>
            <View style={styles.customDateField}>
              <Text style={styles.customDateLabel}>{t("dates.end")}</Text>
              <TextInput
                value={dateWindow.endDate}
                onChangeText={(v) => {
                  const raw = v.trim();
                  if (!isDateKey(raw)) {
                    setDateWindow((prev) => ({ ...prev, endDate: raw }));
                    return;
                  }
                  const endDate = clampDateKey(
                    raw,
                    isDateKey(dateWindow.startDate)
                      ? dateWindow.startDate
                      : minDate,
                    maxDate,
                  );
                  setDateWindow(
                    resolveDateWindow({
                      preset: "custom",
                      startDate: isDateKey(dateWindow.startDate)
                        ? dateWindow.startDate
                        : endDate,
                      endDate,
                      locale,
                    }),
                  );
                }}
                onEndEditing={() => {
                  setDateWindow(
                    resolveDateWindow({
                      preset: "custom",
                      startDate: clampDateKey(
                        dateWindow.startDate,
                        minDate,
                        maxDate,
                      ),
                      endDate: clampDateKey(
                        dateWindow.endDate,
                        minDate,
                        maxDate,
                      ),
                      locale,
                    }),
                  );
                }}
                placeholder={t("mobile.isoDatePlaceholder")}
                placeholderTextColor={colors.outline}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.dateInput}
              />
            </View>
          </View>
        )}

        <Text style={styles.label}>{t("routes.departureTimeLabel")}</Text>
        <Text style={styles.subLabel}>{t("routes.departureStart")}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Pressable
            onPress={() => setDepartureStartHour(null)}
            style={[
              styles.chip,
              departureStartHour == null && styles.chipActive,
            ]}
            disabled={!isPro}
          >
            <Text
              style={[
                styles.chipText,
                departureStartHour == null && styles.chipTextActive,
                !isPro && styles.chipTextLocked,
              ]}
            >
              {t("routes.departureAny")}
            </Text>
          </Pressable>
          {DEPARTURE_HOURS.map((h) => {
            const active = departureStartHour === h;
            return (
              <Pressable
                key={`start-${h}`}
                onPress={() => {
                  if (!isPro) return;
                  setDepartureStartHour(h);
                }}
                style={[
                  styles.chip,
                  active && styles.chipActive,
                  !isPro && styles.chipLocked,
                ]}
                disabled={!isPro}
              >
                <Text
                  style={[
                    styles.chipText,
                    active && styles.chipTextActive,
                    !isPro && styles.chipTextLocked,
                  ]}
                >
                  {isPro
                    ? formatHourOption(h)
                    : t("routes.departureOptionPro", {
                        time: formatHourOption(h),
                      })}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Text style={styles.subLabel}>{t("routes.departureEnd")}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Pressable
            onPress={() => setDepartureEndHour(null)}
            style={[
              styles.chip,
              departureEndHour == null && styles.chipActive,
            ]}
            disabled={!isPro}
          >
            <Text
              style={[
                styles.chipText,
                departureEndHour == null && styles.chipTextActive,
                !isPro && styles.chipTextLocked,
              ]}
            >
              {t("routes.departureAny")}
            </Text>
          </Pressable>
          {DEPARTURE_HOURS.map((h) => {
            const active = departureEndHour === h;
            return (
              <Pressable
                key={`end-${h}`}
                onPress={() => {
                  if (!isPro) return;
                  setDepartureEndHour(h);
                }}
                style={[
                  styles.chip,
                  active && styles.chipActive,
                  !isPro && styles.chipLocked,
                ]}
                disabled={!isPro}
              >
                <Text
                  style={[
                    styles.chipText,
                    active && styles.chipTextActive,
                    !isPro && styles.chipTextLocked,
                  ]}
                >
                  {isPro
                    ? formatHourOption(h)
                    : t("routes.departureOptionPro", {
                        time: formatHourOption(h),
                      })}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {!isPro ? (
          <Text style={styles.hint}>
            {t("routes.departureProNote")}{" "}
            <Link href={"/pro" as Href} style={styles.hintLink}>
              {t("routes.departureUpgrade")}
            </Link>
          </Text>
        ) : null}

        <Pressable
          onPress={() => void loadRoute()}
          disabled={loading || !apiReady}
          style={[styles.cta, (loading || !apiReady) && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel={t("routes.updateRoute")}
        >
          {loading ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <>
              <FontAwesome name="road" size={16} color={colors.onAccent} />
              <Text style={styles.ctaText}>{t("routes.updateRoute")}</Text>
            </>
          )}
        </Pressable>
      </View>

      {error && (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}

      {paywalled ? (
        <SoftPaywall
          surface="route"
          quota={quota}
          onRedeemed={() => {
            setPaywalled(false);
            void loadRoute();
          }}
        />
      ) : null}

      {route && (
        <View style={styles.results}>
          {route.routingStatus === "unreachable" ? (
            <View style={styles.unreachable} accessibilityRole="summary">
              <Text style={styles.unreachableTitle}>
                {t("routes.unreachableTitle")}
              </Text>
              <Text style={styles.unreachableBody}>
                {mode === "cycling"
                  ? t("routes.unreachableBodyCycling")
                  : t("routes.unreachableBodyDriving")}
              </Text>
            </View>
          ) : null}

          <View style={styles.summary}>
            <View style={styles.dryBadge}>
              <Text style={styles.dryValue}>{route.dryTripGuarantee}</Text>
              <Text style={styles.dryUnit}>%</Text>
            </View>
            <View style={styles.summaryBody}>
              <Text style={styles.summaryTitle}>{route.title}</Text>
              <Text style={styles.summaryMeta}>
                {route.routingStatus === "unreachable"
                  ? t("routes.straightLineDistance", {
                      distance: formatDistanceKm(route.distanceKm, locale),
                    })
                  : formatDistanceKm(route.distanceKm, locale)}
                {" · "}
                {route.durationLabel}
              </Text>
              <Text style={styles.summaryLabel}>{t("routes.dryTrip")}</Text>
            </View>
          </View>

          <RoutePolylinePreview
            geometry={route.geometry}
            alternatives={route.alternatives}
          />

          {!signedIn ? (
            <Link href={"/login" as Href} style={styles.saveSecondary}>
              <Text style={styles.saveSecondaryText}>
                {t("routes.saveRouteSignIn")}
              </Text>
            </Link>
          ) : canSaveTrip ? (
            <Pressable
              onPress={() => {
                void (async () => {
                  setSaveBusy(true);
                  setSaveMessage(null);
                  try {
                    await apiPost("/api/trips", {
                      title: `${route.from.name} → ${route.to.name}`,
                      originName: route.from.placeName,
                      destinationName: route.to.placeName,
                      destinationLat: route.to.lat,
                      destinationLon: route.to.lon,
                      originLat: route.from.lat,
                      originLon: route.from.lon,
                      weatherGoal: "best",
                      travelMode: mode,
                      datePreset: dateWindow.preset,
                      startDate: dateWindow.startDate,
                      endDate: dateWindow.endDate,
                      departureStartHour,
                      departureEndHour,
                      distanceKm: route.distanceKm,
                      durationLabel: route.durationLabel,
                    });
                    setSaveMessage(t("routes.saveRouteDone"));
                  } catch (e) {
                    if (e instanceof ApiError && e.status === 402) {
                      setSaveMessage(t("routes.saveRouteLimit"));
                    } else {
                      setSaveMessage(t("routes.saveRouteError"));
                    }
                  } finally {
                    setSaveBusy(false);
                  }
                })();
              }}
              disabled={saveBusy}
              style={[styles.savePrimary, saveBusy && styles.disabled]}
            >
              {saveBusy ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <>
                  <FontAwesome name="bookmark" size={14} color={colors.onPrimary} />
                  <Text style={styles.savePrimaryText}>
                    {t("routes.saveRoute")}
                  </Text>
                </>
              )}
            </Pressable>
          ) : (
            <Link href={"/pro" as Href} style={styles.saveSecondary}>
              <Text style={styles.saveSecondaryText}>
                {t("routes.saveRouteUpgrade")}
              </Text>
            </Link>
          )}
          {saveMessage ? (
            <Text style={styles.saveMsg}>{saveMessage}</Text>
          ) : null}

          <View style={styles.shareRow}>
            <Pressable
              onPress={() => {
                void (async () => {
                  if (!fromPlace || !toPlace) return;
                  setShareBusy(true);
                  setShareMessage(null);
                  try {
                    const modeLabel =
                      mode === "cycling"
                        ? t("travel.cycling")
                        : t("travel.driving");
                    const url = weatherTripRouteShareUrl({
                      apiBase: getApiBaseUrl() || "https://solviax.app",
                      from: fromPlace.placeName,
                      to: toPlace.placeName,
                      fromLat: fromPlace.lat,
                      fromLon: fromPlace.lon,
                      toLat: toPlace.lat,
                      toLon: toPlace.lon,
                      mode,
                      datePreset: dateWindow.preset,
                      startDate: dateWindow.startDate,
                      endDate: dateWindow.endDate,
                    });
                    const departure = route.bestDeparture?.trim();
                    const text = departure
                      ? t("routes.shareTextWithDeparture", {
                          from: fromPlace.name,
                          to: toPlace.name,
                          mode: modeLabel,
                          time: departure,
                        })
                      : t("routes.shareText", {
                          from: fromPlace.name,
                          to: toPlace.name,
                          mode: modeLabel,
                        });
                    await Share.share({
                      message: `${text}\n${url}`,
                      url,
                      title: t("routes.shareTitle"),
                    });
                    setShareMessage(t("routes.shareDone"));
                  } catch {
                    setShareMessage(t("routes.shareError"));
                  } finally {
                    setShareBusy(false);
                  }
                })();
              }}
              disabled={shareBusy}
              style={styles.shareBtn}
            >
              <FontAwesome name="share-alt" size={14} color={colors.onSurface} />
              <Text style={styles.shareBtnText}>
                {shareBusy ? t("routes.sharing") : t("routes.shareRoute")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!fromPlace || !toPlace) return;
                const href = googleMapsDirectionsUrl({
                  origin: { lat: fromPlace.lat, lon: fromPlace.lon },
                  destination: { lat: toPlace.lat, lon: toPlace.lon },
                  waypoints: route.waypoints
                    .filter((wp) => wp.role === "midpoint")
                    .map((wp) => ({ lat: wp.lat, lon: wp.lon })),
                  mode,
                });
                void Linking.openURL(href);
              }}
              style={styles.shareBtn}
            >
              <FontAwesome name="map" size={14} color={colors.onSurface} />
              <Text style={styles.shareBtnText}>
                {t("routes.shareGoogleMaps")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!fromPlace || !toPlace) return;
                const href = appleMapsDirectionsUrl({
                  origin: { lat: fromPlace.lat, lon: fromPlace.lon },
                  destination: { lat: toPlace.lat, lon: toPlace.lon },
                  waypoints: route.waypoints
                    .filter((wp) => wp.role === "midpoint")
                    .map((wp) => ({ lat: wp.lat, lon: wp.lon })),
                  mode,
                });
                void Linking.openURL(href);
              }}
              style={styles.shareBtn}
            >
              <FontAwesome name="apple" size={14} color={colors.onSurface} />
              <Text style={styles.shareBtnText}>
                {t("routes.shareAppleMaps")}
              </Text>
            </Pressable>
          </View>
          {shareMessage ? (
            <Text style={styles.hint}>{shareMessage}</Text>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t("routes.bestDeparture")}</Text>
            <Text style={styles.cardValue}>{route.bestDeparture}</Text>
            {route.departureHint ? (
              <Text style={styles.cardHint}>{route.departureHint}</Text>
            ) : null}
            {route.windowPeakRainProbability != null ? (
              <Text style={styles.cardHint}>
                {t("routes.windowPeakRain", {
                  pct: route.windowPeakRainProbability,
                })}
              </Text>
            ) : null}
          </View>

          {sortedAlts.length > 1 && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>{t("routes.alternativesTitle")}</Text>
              <View style={styles.alts}>
                {sortedAlts.map((alt) => {
                  const selected = alt.selected;
                  return (
                    <Pressable
                      key={alt.index}
                      disabled={selected || loading}
                      onPress={() => void loadRoute({ alt: alt.index })}
                      style={[
                        styles.altCard,
                        selected && styles.altCardSelected,
                      ]}
                    >
                      <View style={styles.altHeader}>
                        <Text style={styles.altTitle}>
                          {alternativeTitle(alt, t)}
                          <Text style={styles.altBadge}>
                            {"  "}
                            {selected
                              ? t("routes.alternativeSelected")
                              : t("routes.alternativeChoose")}
                          </Text>
                        </Text>
                        <Text style={styles.altDuration}>{alt.durationLabel}</Text>
                      </View>
                      <Text style={styles.altMeta}>
                        {t("routes.alternativeDryness", { pct: alt.dryness })}
                        {" · "}
                        {formatDistanceKm(alt.distanceKm, locale)}
                      </Text>
                      <Text style={styles.altMeta}>
                        {t("routes.alternativeAvgRain", {
                          pct: alt.avgRainProbability,
                        })}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t("routes.conditions")}</Text>
            {route.waypoints.map((wp, i) => (
              <View
                key={`${wp.name}-${wp.role}-${i}`}
                style={[
                  styles.waypoint,
                  i < route.waypoints.length - 1 && styles.waypointBorder,
                ]}
              >
                <View style={styles.waypointHeader}>
                  <Text style={styles.waypointName}>{wp.name}</Text>
                  <Text style={styles.waypointTime}>{wp.timeLabel}</Text>
                </View>
                <Text style={styles.waypointMeta}>
                  {Math.round(wp.temperatureC)}°C ·{" "}
                  {translateCondition(wp.condition)} ·{" "}
                  {wp.role === "destination"
                    ? t("routes.arrivalRain", { pct: wp.rainProbability })
                    : `${t("routes.rainProbability")} ${wp.rainProbability}%`}
                  {wp.role === "destination" &&
                  route.windowPeakRainProbability != null
                    ? ` · ${t("routes.windowPeakRain", {
                        pct: route.windowPeakRainProbability,
                      })}`
                    : ""}
                  {wp.precipitationMm != null
                    ? ` · ${t("routes.rainAmountValue", { mm: wp.precipitationMm })}`
                    : ""}
                </Text>
                {wp.advisories.length > 0 ? (
                  wp.advisories.slice(0, 2).map((adv) => (
                    <Text key={adv.id} style={styles.advisory}>
                      {adv.title}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.noAdvisory}>{t("routes.noAdvisories")}</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 48, gap: 14 },
  brand: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.primary,
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
  },
  label: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
  },
  subLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },
  input: {
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
  suggestions: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLowest,
    overflow: "hidden",
  },
  suggestion: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  suggestionText: { color: colors.onSurface, fontSize: 15 },
  suggestionHint: {
    padding: 12,
    color: colors.onSurfaceVariant,
    fontSize: 14,
  },
  modeRow: { flexDirection: "row", gap: 8 },
  modeChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  chipRow: { gap: 8, paddingVertical: 2 },
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3,
  },
  chipLocked: { opacity: 0.55 },
  chipText: { fontWeight: "600", color: colors.onSurface, fontSize: 13 },
  chipTextActive: { color: colors.onPrimary },
  chipTextLocked: { color: colors.onSurfaceVariant },
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
  hint: { fontSize: 13, color: colors.onSurfaceVariant, lineHeight: 18 },
  hintLink: { color: colors.primary, fontWeight: "700" },
  dateRangeHint: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
    marginTop: -4,
  },
  customDates: { flexDirection: "row", gap: 10 },
  customDateField: { flex: 1, gap: 4 },
  customDateLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
  },
  dateInput: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: "600",
    color: colors.onSurface,
  },
  cta: {
    marginTop: 8,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  ctaText: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: "700",
  },
  shareRow: { gap: 8 },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLowest,
    paddingHorizontal: 14,
  },
  shareBtnText: {
    color: colors.onSurface,
    fontWeight: "700",
    fontSize: 14,
  },
  disabled: { opacity: 0.55 },
  error: { color: colors.error, fontWeight: "600" },
  results: { gap: 12 },
  unreachable: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(217, 119, 6, 0.35)",
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    padding: 14,
    gap: 6,
  },
  unreachableTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.onSurface,
  },
  unreachableBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  summary: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    backgroundColor: colors.surfaceLowest,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  dryBadge: {
    width: 72,
    height: 72,
    borderRadius: 999,
    borderWidth: 4,
    borderColor: "rgba(56, 189, 248, 0.25)",
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  dryValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.tertiary,
  },
  dryUnit: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.tertiary,
  },
  summaryBody: { flex: 1, gap: 2 },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.onSurface,
  },
  summaryMeta: { color: colors.onSurfaceVariant, fontSize: 14 },
  summaryLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
  },
  savePrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  savePrimaryText: {
    color: colors.onPrimary,
    fontWeight: "700",
    fontSize: 15,
  },
  saveSecondary: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  saveSecondaryText: {
    color: colors.onSurfaceVariant,
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
  },
  saveMsg: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
  },
  cardValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.onSurface,
  },
  cardHint: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
  alts: { gap: 8 },
  altCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 4,
  },
  altCardSelected: {
    borderColor: "rgba(0, 101, 145, 0.4)",
    backgroundColor: "rgba(0, 101, 145, 0.1)",
  },
  altHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  altTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurface,
  },
  altBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.secondary,
  },
  altDuration: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurface,
  },
  altMeta: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  waypoint: { paddingVertical: 10, gap: 4 },
  waypointBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  waypointHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  waypointName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.onSurface,
  },
  waypointTime: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.secondary,
  },
  waypointMeta: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  advisory: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accentContainer,
  },
  noAdvisory: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
});
}
