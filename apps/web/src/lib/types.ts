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

export type WeatherGoal =
  | "best"
  | "sun"
  | "dry"
  | "mild"
  | "rain"
  | "warm"
  | "calm"
  | "cloudy";

export type DistanceRange =
  | "near"
  | "semi"
  | "surroundings"
  | "neighborhood"
  | "region"
  | "continent"
  | "custom";

/**
 * Travel mode for ETA + routing.
 * `transit` reserved for a future Digitransit/OTP integration — not routed yet.
 */
export type TravelMode = "driving" | "cycling";

export const TRAVEL_MODES: TravelMode[] = ["driving", "cycling"];

export const DEFAULT_TRAVEL_MODE: TravelMode = "driving";

export function isTravelMode(value: string | undefined | null): value is TravelMode {
  return value === "driving" || value === "cycling";
}

/** Material Symbols icon name for a travel mode. */
export function travelModeIcon(mode: TravelMode | string | undefined | null): string {
  return mode === "cycling" ? "directions_bike" : "directions_car";
}

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface PlaceDto {
  id: string;
  name: string;
  placeName: string;
  country?: string;
  countryCode?: string;
  lat: number;
  lon: number;
  /** Mapbox / search result type for UI icons. */
  kind?: "address" | "poi" | "place" | "locality" | "region" | "other";
}

export interface CurrentWeatherDto {
  temperatureC: number;
  feelsLikeC: number;
  humidity: number;
  windSpeedKmh: number;
  visibilityKm: number;
  uvIndex: number;
  uvLabel: string;
  condition: WeatherCondition;
  conditionLabel: string;
  precipitationProbability: number;
  cloudCover: number;
}

export interface DailyForecastDto {
  date: string;
  dayLabel: string;
  tempMaxC: number;
  tempMinC: number;
  precipitationProbability: number;
  /** Expected precipitation amount in mm, when the provider supplies it. */
  precipitationMm?: number;
  cloudCover: number;
  condition: WeatherCondition;
  conditionLabel: string;
}

/** Hourly slot from the forecast provider (local timezone ISO-ish strings). */
export interface HourlyForecastDto {
  /** Local time, typically `YYYY-MM-DDTHH:00` */
  time: string;
  temperatureC: number;
  precipitationProbability: number;
  /** Expected precipitation for this hour (mm), when the provider supplies it. */
  precipitationMm?: number;
  cloudCover: number;
  condition: WeatherCondition;
  conditionLabel: string;
}

export interface PeriodWeatherDto {
  label: string;
  rangeLabel: string;
  startDate: string;
  endDate: string;
  preset?: string;
  temperatureC: number;
  tempMinC: number;
  tempMaxC: number;
  condition: WeatherCondition;
  conditionLabel: string;
  /** Average of daily max precip % over the travel window. */
  rainProbability: number;
  /** Highest daily max precip % in the travel window (peak day risk). */
  peakRainProbability: number;
  /** Total expected precipitation over the window (mm), when available. */
  precipitationMm?: number;
  sunshineScore: number;
  cloudCover: number;
}

export interface WeatherDto {
  place: PlaceDto;
  provider: "open-meteo" | "yr.no" | "mock";
  fetchedAt: string;
  /** IANA timezone from the forecast provider (e.g. Pacific/Honolulu). */
  timezone?: string;
  current: CurrentWeatherDto;
  daily: DailyForecastDto[];
  /** Next ~48h when the provider supplies it (used for route dryness). */
  hourly?: HourlyForecastDto[];
}

export interface DestinationDto {
  id: string;
  slug: string;
  name: string;
  country: string;
  placeName: string;
  lat: number;
  lon: number;
  distanceKm: number;
  /** Forecast for the selected travel window (used for ranking). */
  temperatureC: number;
  condition: WeatherCondition;
  conditionLabel: string;
  rainProbability: number;
  /** Period rain total in mm when forecast provides it. */
  precipitationMm?: number;
  sunshineScore: number;
  imageUrl: string;
  description?: string;
  /** Estimated travel time label from distance (e.g. "20 min"). */
  driveDurationLabel?: string;
  /** Mode used for `driveDurationLabel`. */
  travelMode?: TravelMode;
  /** Daily max temps in the selected window (for mini charts). */
  tempSeries?: number[];
  /** Weekday short labels aligned with `tempSeries` (locale-aware). */
  tempDayLabels?: string[];
  /** Live / now conditions at the destination. */
  current: {
    temperatureC: number;
    condition: WeatherCondition;
    conditionLabel: string;
    rainProbability: number;
  };
  /** Aggregated prediction for the selected dates. */
  forecast: PeriodWeatherDto;
}

export interface DiscoverResultDto {
  origin: PlaceDto;
  weatherGoal: WeatherGoal;
  distance: DistanceRange;
  /** Search radius in km (great-circle / haversine). */
  radiusKm: number;
  datePreset: string;
  dateLabel: string;
  dateRangeLabel: string;
  startDate: string;
  endDate: string;
  destinations: DestinationDto[];
  mapMarkers: MapMarkerDto[];
  /** Current weather at the starting point, when available. */
  originCurrent?: {
    temperatureC: number;
    condition: WeatherCondition;
    conditionLabel: string;
  };
  /** Forecast for the selected dates at the starting point. */
  originForecast?: PeriodWeatherDto;
}

/** Forecast-derived advisory (not official national CAP / Meteoalarm). */
export interface WeatherAdvisoryDto {
  id: string;
  tone: "caution" | "warning";
  icon: string;
  title: string;
  description: string;
}

/** clear / caution / warning — matches routes map legend. */
export type WeatherTone = "clear" | "caution" | "warning";

export interface MapMarkerDto {
  id: string;
  name: string;
  lat: number;
  lon: number;
  temperatureC: number;
  condition: WeatherCondition;
  /** Current / “now” temperature for hover preview. */
  tomorrowTempC?: number;
  tempMinC?: number;
  tempMaxC?: number;
  rainProbability?: number;
  precipitationMm?: number;
  sunshineScore?: number;
  dateRangeLabel?: string;
  conditionLabel?: string;
  distanceKm?: number;
  driveDurationLabel?: string;
  travelMode?: TravelMode;
  tempSeries?: number[];
  /** Weekday short labels aligned with `tempSeries` (locale-aware). */
  tempDayLabels?: string[];
  /** Corridor / forecast severity for marker chrome. */
  tone?: WeatherTone;
  advisories?: WeatherAdvisoryDto[];
}

export interface RouteWaypointDto {
  name: string;
  role: "start" | "midpoint" | "destination";
  timeLabel: string;
  lat: number;
  lon: number;
  temperatureC: number;
  condition: WeatherCondition;
  rainProbability: number;
  /** Expected precipitation around ETA (mm), when available. */
  precipitationMm?: number;
  tone: WeatherTone;
  advisories: WeatherAdvisoryDto[];
}

export type RoutePrefer = "fast" | "weather";

/** One Mapbox alternative considered for weather vs fast choice. */
export interface RouteAlternativeDto {
  index: number;
  distanceKm: number;
  durationLabel: string;
  durationMinutes: number;
  /** Dry-trip % for best departure on this corridor (when scored). */
  dryness: number;
  /** Average rain probability along corridor at that departure. */
  avgRainProbability: number;
  selected: boolean;
  /** Shortest duration among compared alternatives. */
  isFastest: boolean;
  /** Highest dryness (then lowest avg rain) among alternatives. */
  isDriest: boolean;
  geometry: [number, number][];
}

export interface RouteDto {
  id: string;
  title: string;
  from: PlaceDto;
  to: PlaceDto;
  distanceKm: number;
  durationLabel: string;
  /** Routing profile used for geometry / duration. */
  travelMode?: TravelMode;
  dryTripGuarantee: number;
  bestDeparture: string;
  departureHint: string;
  waypoints: RouteWaypointDto[];
  /** Road geometry as [lon, lat] pairs from Mapbox Directions (when available). */
  geometry?: [number, number][];
  /**
   * `routed` = Mapbox network path.
   * `unreachable` = Directions returned NoRoute/NoSegment (no road/ferry for this mode).
   * Omitted when Mapbox was unavailable / errored (legacy soft fallback).
   */
  routingStatus?: "routed" | "unreachable";
  /**
   * Peak daily max rain % at the destination over the selected travel window
   * (same metric destinations use for window risk / advisories).
   */
  windowPeakRainProbability?: number;
  /** How this route was chosen. */
  prefer?: RoutePrefer;
  /** How many Mapbox alternatives were compared (incl. primary). */
  alternativesCompared?: number;
  /** True when weather prefer picked a non-primary alternative. */
  weatherRouteSelected?: boolean;
  /** Extra minutes vs the fastest alternative, when weather route is slower. */
  minutesVsFastest?: number | null;
  /** All Mapbox alternatives (scored when prefer=weather). */
  alternatives?: RouteAlternativeDto[];
}

export interface TripDto {
  id: string;
  title: string;
  originName: string;
  destinationName: string;
  destinationLat: number;
  destinationLon: number;
  originLat?: number | null;
  originLon?: number | null;
  weatherGoal?: string | null;
  travelMode?: TravelMode | string | null;
  datePreset?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  /** Local hour 0–23; null/undefined = any start. */
  departureStartHour?: number | null;
  /** Local hour 0–23 inclusive; null/undefined = any end. */
  departureEndHour?: number | null;
  distanceKm?: number | null;
  durationLabel?: string | null;
  createdAt: string;
}

export interface UserDto {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface SuitabilityBadgeDto {
  id: string;
  tone: "success" | "info" | "warning";
  icon: string;
  title: string;
  description: string;
}
