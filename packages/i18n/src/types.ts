export type WeatherCondition =
  | "sunny"
  | "partly_cloudy"
  | "cloudy"
  | "rainy"
  | "freezing_rain"
  | "storm"
  | "hail"
  | "snow"
  | "fog";

export type Locale = "en" | "fi";

export const locales: Locale[] = ["en", "fi"];
export const defaultLocale: Locale = "en";
