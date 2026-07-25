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
  temperatureC: number;
  condition: WeatherCondition;
  conditionLabel: string;
  rainProbability: number;
  sunshineScore: number;
  imageUrl: string;
  description?: string;
}

export interface DiscoverResultDto {
  origin: PlaceDto;
  weatherGoal: WeatherGoal;
  distance: DistanceRange;
  datePreset: string;
  destinations: DestinationDto[];
  mapMarkers: MapMarkerDto[];
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
