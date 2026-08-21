import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Link, type Href } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useI18n } from "@/lib/i18n";
import { formatDistanceKm } from "@/lib/distance";
import { getApiBaseUrl } from "@/lib/api";
import type { AppColors } from "@/constants/Colors";
import { useColors } from "@/lib/theme";
import type { DestinationDto } from "@/lib/types";

function resolveImageUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = getApiBaseUrl();
  if (!base) return url;
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

export function DestinationCard({
  destination,
  rank,
  routeHref,
}: {
  destination: DestinationDto;
  /** 1-based recommendation rank (Map / ranked lists). */
  rank?: number;
  /** When set, shows Generate Route below the card body. */
  routeHref?: Href;
}) {
  const { t, translateCondition, locale } = useI18n();

  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const forecast = destination.forecast;
  const imageUri = resolveImageUrl(destination.imageUrl);
  const title =
    rank != null
      ? t("map.rankedName", { rank, name: destination.placeName })
      : destination.placeName;
  const href = {
    pathname: "/destination/[slug]" as const,
    params: {
      slug: destination.slug,
      lat: String(destination.lat),
      lon: String(destination.lon),
      name: destination.placeName,
    },
  };

  return (
    <View style={styles.card}>
      <Link href={href} asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t("card.viewDestination", {
            name: destination.placeName,
          })}
          style={({ pressed }) => [styles.cardPress, pressed && styles.pressed]}
        >
          <View style={styles.imageWrap}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.image}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.image, styles.imageFallback]} />
            )}
            <View style={styles.imageBadge}>
              <Text style={styles.imageBadgeText}>
                {Math.round(forecast.tempMinC)}–{Math.round(forecast.tempMaxC)}°C
              </Text>
            </View>
          </View>

          <View style={styles.body}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.meta}>
              {translateCondition(forecast.condition)} ·{" "}
              {t("card.rain", { pct: forecast.rainProbability })}
              {destination.distanceKm > 0
                ? ` · ${formatDistanceKm(destination.distanceKm, locale)}`
                : ""}
              {destination.driveDurationLabel
                ? ` · ${destination.driveDurationLabel}`
                : ""}
            </Text>

            <View style={styles.row}>
              <View style={styles.pill}>
                <Text style={styles.pillLabel}>{t("card.now")}</Text>
                <Text style={styles.pillValue}>
                  <FontAwesome
                    name="thermometer-half"
                    size={12}
                    color={colors.onSurface}
                  />{" "}
                  {Math.round(destination.current.temperatureC)}°C
                </Text>
              </View>
              <View style={[styles.pill, styles.pillForecast]}>
                <Text style={[styles.pillLabel, styles.pillForecastLabel]}>
                  {t("card.forecast")}
                </Text>
                <Text style={styles.pillValue}>
                  {Math.round(forecast.tempMaxC)}°C · {forecast.label}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
      </Link>

      {routeHref ? (
        <View style={styles.routeWrap}>
          <Link href={routeHref} asChild>
            <Pressable
              accessibilityRole="link"
              style={({ pressed }) => [
                styles.routeBtn,
                pressed && styles.routePressed,
              ]}
            >
              <FontAwesome name="road" size={14} color={colors.onAccent} />
              <Text style={styles.routeText}>{t("map.generateRoute")}</Text>
            </Pressable>
          </Link>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardPress: { overflow: "hidden" },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  imageWrap: {
    height: 140,
    backgroundColor: colors.surfaceContainer,
  },
  image: { width: "100%", height: "100%" },
  imageFallback: { backgroundColor: colors.surfaceContainer },
  imageBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(252, 248, 255, 0.92)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  imageBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurface,
  },
  body: { padding: 16, gap: 8 },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.onSurface,
  },
  meta: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
  row: { flexDirection: "row", gap: 8, marginTop: 4 },
  pill: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillForecast: {
    backgroundColor: "rgba(0, 101, 145, 0.1)",
  },
  pillLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
  },
  pillForecastLabel: { color: colors.secondary },
  pillValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurface,
  },
  routeWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  routeBtn: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  routePressed: { opacity: 0.9 },
  routeText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.onAccent,
  },
});
}
