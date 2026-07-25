import type {
  DestinationDto,
  PlaceDto,
  RouteDto,
  TripDto,
  UserDto,
  WeatherCondition,
} from "@/lib/types";

export const MOCK_USER: UserDto = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "demo@weathertrip.app",
  displayName: "Demo Traveler",
  avatarUrl: null,
};

export const PLACES: PlaceDto[] = [
  {
    id: "helsinki",
    name: "Helsinki",
    placeName: "Helsinki, Finland",
    country: "Finland",
    countryCode: "FI",
    lat: 60.1699,
    lon: 24.9384,
  },
  {
    id: "turku",
    name: "Turku",
    placeName: "Turku, Finland",
    country: "Finland",
    countryCode: "FI",
    lat: 60.4518,
    lon: 22.2666,
  },
  {
    id: "tampere",
    name: "Tampere",
    placeName: "Tampere, Finland",
    country: "Finland",
    countryCode: "FI",
    lat: 61.4978,
    lon: 23.761,
  },
  {
    id: "naantali",
    name: "Naantali",
    placeName: "Naantali, Finland",
    country: "Finland",
    countryCode: "FI",
    lat: 60.4667,
    lon: 22.0333,
  },
  {
    id: "stockholm",
    name: "Stockholm",
    placeName: "Stockholm, Sweden",
    country: "Sweden",
    countryCode: "SE",
    lat: 59.3293,
    lon: 18.0686,
  },
  {
    id: "copenhagen",
    name: "Copenhagen",
    placeName: "Copenhagen, Denmark",
    country: "Denmark",
    countryCode: "DK",
    lat: 55.6761,
    lon: 12.5683,
  },
  {
    id: "oslo",
    name: "Oslo",
    placeName: "Oslo, Norway",
    country: "Norway",
    countryCode: "NO",
    lat: 59.9139,
    lon: 10.7522,
  },
  {
    id: "london",
    name: "London",
    placeName: "London, UK",
    country: "United Kingdom",
    countryCode: "GB",
    lat: 51.5074,
    lon: -0.1278,
  },
  {
    id: "hameenlinna",
    name: "Hämeenlinna",
    placeName: "Hämeenlinna, Finland",
    country: "Finland",
    countryCode: "FI",
    lat: 60.9959,
    lon: 24.4642,
  },
];

export const DESTINATION_CATALOG: DestinationDto[] = [
  {
    id: "naantali",
    slug: "naantali",
    name: "Naantali",
    country: "Suomi",
    placeName: "Naantali, Suomi",
    lat: 60.4667,
    lon: 22.0333,
    distanceKm: 168,
    temperatureC: 24,
    condition: "sunny",
    conditionLabel: "Aurinkoista",
    rainProbability: 0,
    sunshineScore: 96,
    imageUrl: "/images/naantali.jpg",
    description: "Sunny seaside town with clear skies this weekend.",
  },
  {
    id: "stockholm",
    slug: "stockholm",
    name: "Tukholma",
    country: "Ruotsi",
    placeName: "Tukholma, Ruotsi",
    lat: 59.3293,
    lon: 18.0686,
    distanceKm: 480,
    temperatureC: 22,
    condition: "partly_cloudy",
    conditionLabel: "Puolipilvistä",
    rainProbability: 10,
    sunshineScore: 82,
    imageUrl: "/images/stockholm.jpg",
    description: "Archipelago sunshine with mild afternoon breezes.",
  },
  {
    id: "copenhagen",
    slug: "copenhagen",
    name: "Kööpenhamina",
    country: "Tanska",
    placeName: "Kööpenhamina, Tanska",
    lat: 55.6761,
    lon: 12.5683,
    distanceKm: 880,
    temperatureC: 21,
    condition: "sunny",
    conditionLabel: "Aurinkoista",
    rainProbability: 5,
    sunshineScore: 88,
    imageUrl: "/images/copenhagen.jpg",
    description: "Bright Nyhavn days and dry walking weather.",
  },
  {
    id: "turku",
    slug: "turku",
    name: "Turku",
    country: "Suomi",
    placeName: "Turku, Suomi",
    lat: 60.4518,
    lon: 22.2666,
    distanceKm: 165,
    temperatureC: 21,
    condition: "partly_cloudy",
    conditionLabel: "Puolipilvistä",
    rainProbability: 15,
    sunshineScore: 74,
    imageUrl: "/images/naantali.jpg",
    description: "Scattered clouds with excellent trip suitability.",
  },
  {
    id: "tampere",
    slug: "tampere",
    name: "Tampere",
    country: "Suomi",
    placeName: "Tampere, Suomi",
    lat: 61.4978,
    lon: 23.761,
    distanceKm: 178,
    temperatureC: 19,
    condition: "partly_cloudy",
    conditionLabel: "Puolipilvistä",
    rainProbability: 5,
    sunshineScore: 70,
    imageUrl: "/images/stockholm.jpg",
    description: "Dry corridor from Helsinki with mild temps.",
  },
  {
    id: "oslo",
    slug: "oslo",
    name: "Oslo",
    country: "Norja",
    placeName: "Oslo, Norja",
    lat: 59.9139,
    lon: 10.7522,
    distanceKm: 780,
    temperatureC: 18,
    condition: "cloudy",
    conditionLabel: "Pilvistä",
    rainProbability: 35,
    sunshineScore: 48,
    imageUrl: "/images/copenhagen.jpg",
    description: "Cooler and cloudier — better for calm city walks.",
  },
];

export const MOCK_TRIPS: TripDto[] = [
  {
    id: "trip-1",
    title: "Sunny weekend in Naantali",
    originName: "Helsinki",
    destinationName: "Naantali, Suomi",
    destinationLat: 60.4667,
    destinationLon: 22.0333,
    weatherGoal: "sun",
    distanceKm: 168,
    createdAt: new Date().toISOString(),
  },
  {
    id: "trip-2",
    title: "Dry drive to Tampere",
    originName: "Helsinki",
    destinationName: "Tampere, Suomi",
    destinationLat: 61.4978,
    destinationLon: 23.761,
    weatherGoal: "dry",
    distanceKm: 178,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const MOCK_ROUTE: RouteDto = {
  id: "helsinki-tampere",
  title: "Helsinki to Tampere",
  from: PLACES.find((p) => p.id === "helsinki")!,
  to: PLACES.find((p) => p.id === "tampere")!,
  distanceKm: 178,
  durationLabel: "2h 10m",
  dryTripGuarantee: 94,
  bestDeparture: "10:00 AM",
  departureHint:
    "Leave at 10:00 AM to avoid afternoon showers near Hämeenlinna.",
  waypoints: [
    {
      name: "Helsinki",
      role: "start",
      timeLabel: "10:00 AM • Start",
      lat: 60.1699,
      lon: 24.9384,
      temperatureC: 18,
      condition: "sunny",
      rainProbability: 0,
    },
    {
      name: "Hämeenlinna",
      role: "midpoint",
      timeLabel: "11:15 AM • Midpoint",
      lat: 60.9959,
      lon: 24.4642,
      temperatureC: 17,
      condition: "cloudy",
      rainProbability: 15,
    },
    {
      name: "Tampere",
      role: "destination",
      timeLabel: "12:10 PM • Destination",
      lat: 61.4978,
      lon: 23.761,
      temperatureC: 19,
      condition: "partly_cloudy",
      rainProbability: 5,
    },
  ],
};

export function conditionFromCode(code: number): {
  condition: WeatherCondition;
  label: string;
} {
  if (code === 0) return { condition: "sunny", label: "Clear" };
  if (code <= 2) return { condition: "partly_cloudy", label: "Partly cloudy" };
  if (code <= 3) return { condition: "cloudy", label: "Cloudy" };
  if (code <= 48) return { condition: "fog", label: "Foggy" };
  if (code <= 67 || (code >= 80 && code <= 82))
    return { condition: "rainy", label: "Rainy" };
  if (code <= 77 || code >= 85) return { condition: "snow", label: "Snow" };
  if (code >= 95) return { condition: "storm", label: "Storm" };
  return { condition: "cloudy", label: "Cloudy" };
}

export function uvLabel(index: number): string {
  if (index < 3) return "Low";
  if (index < 6) return "Moderate";
  if (index < 8) return "High";
  if (index < 11) return "Very high";
  return "Extreme";
}

export function findPlace(query: string): PlaceDto | undefined {
  const q = query.toLowerCase().trim();
  return PLACES.find(
    (p) =>
      p.name.toLowerCase() === q ||
      p.placeName.toLowerCase().includes(q) ||
      p.id === q,
  );
}

export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}
