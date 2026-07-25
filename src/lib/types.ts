export type WeatherCondition =
  | "sunny"
  | "partly_cloudy"
  | "cloudy"
  | "rainy"
  | "storm"
  | "snow"
  | "fog";

export type WeatherGoal =
  | "sun"
  | "dry"
  | "mild"
  | "warm"
  | "calm"
  | "cloudy";

export type DistanceRange =
  | "near"
  | "region"
  | "country"
  | "continent"
  | "global";

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
  cloudCover: number;
  condition: WeatherCondition;
  conditionLabel: string;
}

export interface PeriodWeatherDto {
  label: string;
  rangeLabel: string;
  startDate: string;
  endDate: string;
  temperatureC: number;
  tempMinC: number;
  tempMaxC: number;
  condition: WeatherCondition;
  conditionLabel: string;
  rainProbability: number;
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
  sunshineScore: number;
  imageUrl: string;
  description?: string;
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
  tomorrowTempC?: number;
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
  dryTripGuarantee: number;
  bestDeparture: string;
  departureHint: string;
  waypoints: RouteWaypointDto[];
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
