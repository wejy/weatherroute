import { useCallback, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, useFocusEffect, type Href } from "expo-router";
import { useI18n } from "@/lib/i18n";
import { apiDelete, apiGet, getApiBaseUrl } from "@/lib/api";
import { fetchSession } from "@/lib/session";
import { formatDistanceKm } from "@/lib/distance";
import type { AppColors } from "@/constants/Colors";
import { useColors } from "@/lib/theme";
import type { TripDto, TravelMode } from "@/lib/types";

export default function TripsScreen() {
  const { t, locale } = useI18n();

  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const apiReady = Boolean(getApiBaseUrl());
  const [trips, setTrips] = useState<TripDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await fetchSession();
      setSignedIn(Boolean(session.user));
      if (!session.user) {
        setTrips([]);
        return;
      }
      if (!apiReady) {
        setError(t("mobile.apiMissing"));
        return;
      }
      const data = await apiGet<{ trips: TripDto[] }>("/api/trips");
      setTrips(data.trips);
    } catch {
      setError(t("mobile.errorGeneric"));
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, [apiReady, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await apiDelete(`/api/trips/${id}`);
        setTrips((prev) => prev.filter((x) => x.id !== id));
      } catch {
        setError(t("mobile.errorGeneric"));
      }
    },
    [t],
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t("trips.title")}</Text>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!signedIn && !loading ? (
        <View style={styles.emptyBox}>
          <Text style={styles.empty}>{t("routes.saveRouteSignIn")}</Text>
          <Link href={"/login" as Href} style={styles.cta}>
            <Text style={styles.ctaText}>{t("login.title")}</Text>
          </Link>
        </View>
      ) : null}

      {signedIn && !loading && trips.length === 0 ? (
        <Text style={styles.empty}>{t("trips.empty")}</Text>
      ) : null}

      {trips.map((trip) => {
        const mode = (trip.travelMode ?? "driving") as TravelMode;
        return (
          <View key={trip.id} style={styles.card}>
            <Text style={styles.cardTitle}>{trip.title}</Text>
            <Text style={styles.cardMeta}>
              {trip.originName} → {trip.destinationName}
            </Text>
            <Text style={styles.cardMeta}>
              {mode === "cycling" ? t("travel.cycling") : t("travel.driving")}
              {trip.distanceKm != null && trip.distanceKm > 0
                ? ` · ${formatDistanceKm(trip.distanceKm, locale)}`
                : ""}
              {trip.durationLabel ? ` · ${trip.durationLabel}` : ""}
            </Text>
            <View style={styles.row}>
              <Link
                href={
                  {
                    pathname: "/(tabs)/routes",
                  } as Href
                }
                style={styles.linkBtn}
              >
                <Text style={styles.linkText}>{t("trips.openRoute")}</Text>
              </Link>
              <Pressable
                onPress={() => void remove(trip.id)}
                style={styles.removeBtn}
              >
                <Text style={styles.removeText}>{t("trips.remove")}</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: 4,
  },
  emptyBox: { gap: 12, marginTop: 12 },
  empty: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurfaceVariant,
  },
  error: { color: colors.error, fontSize: 14 },
  cta: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  ctaText: { color: colors.onPrimary, fontWeight: "700" },
  card: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 6,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.onSurface,
  },
  cardMeta: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  linkBtn: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    alignItems: "center",
  },
  linkText: { color: colors.onPrimary, fontWeight: "700", fontSize: 13 },
  removeBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  removeText: { color: colors.onSurfaceVariant, fontWeight: "600", fontSize: 13 },
});
}
