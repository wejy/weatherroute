import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Link } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useI18n } from "@/lib/i18n";
import { getApiBaseUrl } from "@/lib/api";
import { colors } from "@/constants/Colors";
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
}: {
  destination: DestinationDto;
}) {
  const { t, translateCondition } = useI18n();
  const forecast = destination.forecast;
  const imageUri = resolveImageUrl(destination.imageUrl);
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
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
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
          <Text style={styles.title}>{destination.placeName}</Text>
          <Text style={styles.meta}>
            {translateCondition(forecast.condition)} ·{" "}
            {t("card.rain", { pct: forecast.rainProbability })}
            {destination.distanceKm > 0
              ? ` · ${destination.distanceKm} km`
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
  );
}

const styles = StyleSheet.create({
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
});
