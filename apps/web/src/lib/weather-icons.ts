import type { WeatherCondition } from "@/lib/types";

const ICONS: Record<WeatherCondition, string> = {
  sunny: "wb_sunny",
  partly_cloudy: "partly_cloudy_day",
  cloudy: "cloud",
  rainy: "rainy",
  storm: "thunderstorm",
  snow: "weather_snowy",
  fog: "foggy",
};

export function weatherIcon(condition: WeatherCondition): string {
  return ICONS[condition] ?? "partly_cloudy_day";
}

export function weatherIconClass(condition: WeatherCondition): string {
  switch (condition) {
    case "sunny":
      return "text-tertiary-container";
    case "partly_cloudy":
      return "text-secondary";
    case "rainy":
    case "storm":
      return "text-primary";
    default:
      return "text-outline";
  }
}
