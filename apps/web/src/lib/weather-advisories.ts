import type { WeatherCondition, WeatherAdvisoryDto } from "@/lib/types";
import { weatherTone, type WeatherTone } from "@/lib/weather-tone";

type Tr = (key: string, vars?: Record<string, string | number>) => string;

export type AdvisoryInput = {
  rainProbability: number;
  condition: WeatherCondition;
  temperatureC?: number;
  windSpeedKmh?: number;
  /** Place / day label for wet-day style copy (optional). */
  placeLabel?: string;
};

function isThunderLike(condition: WeatherCondition): boolean {
  return condition === "storm" || condition === "hail";
}

/**
 * Forecast-derived advisories (not official CAP/Meteoalarm).
 * Used on routes, destinations, and map markers until a national alerts feed exists.
 */
export function buildWeatherAdvisories(
  input: AdvisoryInput,
  t: Tr,
): WeatherAdvisoryDto[] {
  const out: WeatherAdvisoryDto[] = [];
  const {
    rainProbability,
    condition,
    temperatureC,
    windSpeedKmh,
    placeLabel,
  } = input;

  if (condition === "hail") {
    out.push({
      id: "hail",
      tone: "warning",
      icon: "weather_hail",
      title: t("advisory.hailTitle"),
      description: placeLabel
        ? t("advisory.hailDescPlace", { place: placeLabel })
        : t("advisory.hailDesc"),
    });
  } else if (condition === "storm") {
    out.push({
      id: "storm",
      tone: "warning",
      icon: "thunderstorm",
      title: t("advisory.stormTitle"),
      description: placeLabel
        ? t("advisory.stormDescPlace", { place: placeLabel })
        : t("advisory.stormDesc"),
    });
  }

  if (condition === "freezing_rain") {
    out.push({
      id: "freezing_rain",
      tone: "warning",
      icon: "ac_unit",
      title: t("advisory.freezingRainTitle"),
      description: placeLabel
        ? t("advisory.freezingRainDescPlace", { place: placeLabel })
        : t("advisory.freezingRainDesc"),
    });
  }

  if (condition === "snow") {
    out.push({
      id: "snow",
      tone: "warning",
      icon: "ac_unit",
      title: t("advisory.snowTitle"),
      description: placeLabel
        ? t("advisory.snowDescPlace", { place: placeLabel })
        : t("advisory.snowDesc"),
    });
  }

  if (condition === "fog") {
    out.push({
      id: "fog",
      tone: "caution",
      icon: "foggy",
      title: t("advisory.fogTitle"),
      description: placeLabel
        ? t("advisory.fogDescPlace", { place: placeLabel })
        : t("advisory.fogDesc"),
    });
  }

  if (rainProbability >= 50 && !isThunderLike(condition) && condition !== "freezing_rain") {
    out.push({
      id: "rain",
      tone: "warning",
      icon: "umbrella",
      title: t("advisory.rainTitle"),
      description: placeLabel
        ? t("advisory.rainDescPlace", {
            pct: rainProbability,
            place: placeLabel,
          })
        : t("advisory.rainDesc", { pct: rainProbability }),
    });
  } else if (
    rainProbability >= 30 &&
    !isThunderLike(condition) &&
    condition !== "rainy" &&
    condition !== "freezing_rain"
  ) {
    out.push({
      id: "rain-moderate",
      tone: "caution",
      icon: "water_drop",
      title: t("advisory.rainCautionTitle"),
      description: placeLabel
        ? t("advisory.rainDescPlace", {
            pct: rainProbability,
            place: placeLabel,
          })
        : t("advisory.rainDesc", { pct: rainProbability }),
    });
  } else if (condition === "rainy" && rainProbability < 50) {
    out.push({
      id: "rain-condition",
      tone: "caution",
      icon: "water_drop",
      title: t("advisory.rainCautionTitle"),
      description: placeLabel
        ? t("advisory.rainDescPlace", {
            pct: Math.max(rainProbability, 30),
            place: placeLabel,
          })
        : t("advisory.rainDesc", { pct: Math.max(rainProbability, 30) }),
    });
  }

  /**
   * Road icing / slipperiness heuristic (not official black-ice alerts).
   * Freezing rain always qualifies; otherwise near-freezing air + precip/fog.
   */
  const icingFromFreezingRain = condition === "freezing_rain";
  const icingFromNearFreeze =
    temperatureC != null &&
    temperatureC >= -5 &&
    temperatureC <= 2 &&
    (rainProbability >= 30 ||
      condition === "rainy" ||
      condition === "snow" ||
      condition === "fog" ||
      condition === "freezing_rain");
  if (icingFromFreezingRain || icingFromNearFreeze) {
    out.push({
      id: "icing",
      tone: icingFromFreezingRain || (temperatureC != null && temperatureC <= 0)
        ? "warning"
        : "caution",
      icon: "severe_cold",
      title: t("advisory.icingTitle"),
      description: t("advisory.icingDesc"),
    });
  }

  if (windSpeedKmh != null && windSpeedKmh >= 50) {
    out.push({
      id: "wind",
      tone: "warning",
      icon: "air",
      title: t("advisory.windTitle"),
      description: t("advisory.windDesc", { speed: Math.round(windSpeedKmh) }),
    });
  } else if (windSpeedKmh != null && windSpeedKmh >= 35) {
    out.push({
      id: "wind-moderate",
      tone: "caution",
      icon: "air",
      title: t("advisory.windCautionTitle"),
      description: t("advisory.windDesc", { speed: Math.round(windSpeedKmh) }),
    });
  }

  if (temperatureC != null && temperatureC >= 30) {
    out.push({
      id: "heat",
      tone: temperatureC >= 33 ? "warning" : "caution",
      icon: "thermometer",
      title: t("advisory.heatTitle"),
      description: t("advisory.heatDesc", { temp: Math.round(temperatureC) }),
    });
  }

  if (temperatureC != null && temperatureC <= -10) {
    out.push({
      id: "cold",
      tone: temperatureC <= -20 ? "warning" : "caution",
      icon: "severe_cold",
      title: t("advisory.coldTitle"),
      description: t("advisory.coldDesc", { temp: Math.round(temperatureC) }),
    });
  }

  return out;
}

export function toneFromAdvisories(
  rainProbability: number,
  condition: WeatherCondition,
  advisories: WeatherAdvisoryDto[],
): WeatherTone {
  const base = weatherTone(rainProbability, condition);
  if (advisories.some((a) => a.tone === "warning")) return "warning";
  if (advisories.some((a) => a.tone === "caution") && base === "clear") {
    return "caution";
  }
  return base;
}
