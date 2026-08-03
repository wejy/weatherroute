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

export interface PlaceDto {
  id: string;
  name: string;
  placeName: string;
  country?: string;
  lat: number;
  lon: number;
  kind?: "address" | "poi" | "place" | "locality" | "region" | "other";
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
  peakRainProbability?: number;
  precipitationMm?: number;
  sunshineScore: number;
  cloudCover: number;
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
  precipitationMm?: number;
  sunshineScore: number;
  imageUrl: string;
  description?: string;
  driveDurationLabel?: string;
  tempSeries?: number[];
  /** Weekday short labels aligned with `tempSeries` (locale-aware). */
  tempDayLabels?: string[];
  current: {
    temperatureC: number;
    condition: WeatherCondition;
    conditionLabel: string;
    rainProbability: number;
  };
  forecast: PeriodWeatherDto;
}

export interface DiscoverResultDto {
  origin: PlaceDto;
  weatherGoal: WeatherGoal;
  distance: string;
  radiusKm: number;
  datePreset: string;
  dateLabel: string;
  dateRangeLabel: string;
  startDate: string;
  endDate: string;
  destinations: DestinationDto[];
  originCurrent?: {
    temperatureC: number;
    condition: WeatherCondition;
    conditionLabel: string;
  };
  originForecast?: PeriodWeatherDto;
}

export type TravelMode = "driving" | "cycling";
export type RoutePrefer = "fast" | "weather";
export type WeatherTone = "clear" | "caution" | "warning";

export interface WeatherAdvisoryDto {
  id: string;
  severity: "info" | "caution" | "warning";
  title: string;
  detail: string;
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
  precipitationMm?: number;
  tone: WeatherTone;
  advisories: WeatherAdvisoryDto[];
}

export interface RouteAlternativeDto {
  index: number;
  distanceKm: number;
  durationLabel: string;
  durationMinutes: number;
  dryness: number;
  avgRainProbability: number;
  selected: boolean;
  isFastest: boolean;
  isDriest: boolean;
}

export interface RouteDto {
  id: string;
  title: string;
  from: PlaceDto;
  to: PlaceDto;
  distanceKm: number;
  durationLabel: string;
  travelMode?: TravelMode;
  dryTripGuarantee: number;
  bestDeparture: string;
  departureHint: string;
  waypoints: RouteWaypointDto[];
  prefer?: RoutePrefer;
  alternativesCompared?: number;
  weatherRouteSelected?: boolean;
  minutesVsFastest?: number | null;
  alternatives?: RouteAlternativeDto[];
  routingStatus?: "routed" | "unreachable";
  windowPeakRainProbability?: number;
}

export interface WeatherDto {
  place: PlaceDto;
  provider: string;
  fetchedAt: string;
  current: {
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
  };
  daily: Array<{
    date: string;
    dayLabel: string;
    tempMaxC: number;
    tempMinC: number;
    precipitationProbability: number;
    precipitationMm?: number;
    cloudCover: number;
    condition: WeatherCondition;
    conditionLabel: string;
  }>;
  hourly?: Array<{
    time: string;
    temperatureC: number;
    precipitationProbability: number;
    precipitationMm?: number;
    cloudCover: number;
    condition: WeatherCondition;
    conditionLabel: string;
  }>;
}
