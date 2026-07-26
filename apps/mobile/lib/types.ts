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
}
