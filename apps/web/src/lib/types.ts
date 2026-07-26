export type WeatherCondition =
  | "sunny"
  | "partly_cloudy"
  | "cloudy"
  | "rainy"
  | "storm"
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
  rainProbability: number;
  /** Total expected precipitation over the window (mm), when available. */
  precipitationMm?: number;
  sunshineScore: number;
  cloudCover: number;
}

export interface WeatherDto {
  place: PlaceDto;
  provider: "open-meteo" | "yr.no" | "mock";
  fetchedAt: string;
  current: CurrentWeatherDto;
  daily: DailyForecastDto[];
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
}

export interface TripDto {
  id: string;
  title: string;
  originName: string;
  destinationName: string;
  destinationLat: number;
  destinationLon: number;
  weatherGoal?: string | null;
  distanceKm?: number | null;
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
