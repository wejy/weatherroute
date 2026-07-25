import type { PlaceDto } from "@/lib/types";
import { haversineKm } from "@/server/integrations/mocks/data";

/** Major towns/cities used as discover candidates (no API key). */
export const WORLD_CITIES: PlaceDto[] = [
  // Finland / Nordics
  { id: "helsinki", name: "Helsinki", placeName: "Helsinki, Finland", country: "Finland", countryCode: "FI", lat: 60.1699, lon: 24.9384 },
  { id: "espoo", name: "Espoo", placeName: "Espoo, Finland", country: "Finland", countryCode: "FI", lat: 60.2055, lon: 24.6559 },
  { id: "vantaa", name: "Vantaa", placeName: "Vantaa, Finland", country: "Finland", countryCode: "FI", lat: 60.2934, lon: 25.0378 },
  { id: "tampere", name: "Tampere", placeName: "Tampere, Finland", country: "Finland", countryCode: "FI", lat: 61.4978, lon: 23.761 },
  { id: "turku", name: "Turku", placeName: "Turku, Finland", country: "Finland", countryCode: "FI", lat: 60.4518, lon: 22.2666 },
  { id: "oulu", name: "Oulu", placeName: "Oulu, Finland", country: "Finland", countryCode: "FI", lat: 65.0121, lon: 25.4651 },
  { id: "jyvaskyla", name: "Jyväskylä", placeName: "Jyväskylä, Finland", country: "Finland", countryCode: "FI", lat: 62.2426, lon: 25.7473 },
  { id: "kuopio", name: "Kuopio", placeName: "Kuopio, Finland", country: "Finland", countryCode: "FI", lat: 62.8924, lon: 27.677 },
  { id: "lahti", name: "Lahti", placeName: "Lahti, Finland", country: "Finland", countryCode: "FI", lat: 60.9827, lon: 25.6612 },
  { id: "pori", name: "Pori", placeName: "Pori, Finland", country: "Finland", countryCode: "FI", lat: 61.4851, lon: 21.7974 },
  { id: "kouvola", name: "Kouvola", placeName: "Kouvola, Finland", country: "Finland", countryCode: "FI", lat: 60.8667, lon: 26.7 },
  { id: "joensuu", name: "Joensuu", placeName: "Joensuu, Finland", country: "Finland", countryCode: "FI", lat: 62.601, lon: 29.7636 },
  { id: "lappeenranta", name: "Lappeenranta", placeName: "Lappeenranta, Finland", country: "Finland", countryCode: "FI", lat: 61.0583, lon: 28.1887 },
  { id: "hameenlinna", name: "Hämeenlinna", placeName: "Hämeenlinna, Finland", country: "Finland", countryCode: "FI", lat: 60.9959, lon: 24.4642 },
  { id: "vaasa", name: "Vaasa", placeName: "Vaasa, Finland", country: "Finland", countryCode: "FI", lat: 63.096, lon: 21.6158 },
  { id: "rovaniemi", name: "Rovaniemi", placeName: "Rovaniemi, Finland", country: "Finland", countryCode: "FI", lat: 66.5039, lon: 25.7294 },
  { id: "seinajoki", name: "Seinäjoki", placeName: "Seinäjoki, Finland", country: "Finland", countryCode: "FI", lat: 62.7903, lon: 22.8403 },
  { id: "mikkeli", name: "Mikkeli", placeName: "Mikkeli, Finland", country: "Finland", countryCode: "FI", lat: 61.6886, lon: 27.2725 },
  { id: "kotka", name: "Kotka", placeName: "Kotka, Finland", country: "Finland", countryCode: "FI", lat: 60.4664, lon: 26.9458 },
  { id: "salo", name: "Salo", placeName: "Salo, Finland", country: "Finland", countryCode: "FI", lat: 60.3833, lon: 23.1333 },
  { id: "porvoo", name: "Porvoo", placeName: "Porvoo, Finland", country: "Finland", countryCode: "FI", lat: 60.3925, lon: 25.665 },
  { id: "lohja", name: "Lohja", placeName: "Lohja, Finland", country: "Finland", countryCode: "FI", lat: 60.25, lon: 24.0833 },
  { id: "rauma", name: "Rauma", placeName: "Rauma, Finland", country: "Finland", countryCode: "FI", lat: 61.1272, lon: 21.5113 },
  { id: "naantali", name: "Naantali", placeName: "Naantali, Finland", country: "Finland", countryCode: "FI", lat: 60.4667, lon: 22.0333 },
  { id: "hanko", name: "Hanko", placeName: "Hanko, Finland", country: "Finland", countryCode: "FI", lat: 59.8333, lon: 22.9667 },
  { id: "mariehamn", name: "Mariehamn", placeName: "Mariehamn, Åland", country: "Finland", countryCode: "FI", lat: 60.1, lon: 19.9333 },
  { id: "stockholm", name: "Stockholm", placeName: "Stockholm, Sweden", country: "Sweden", countryCode: "SE", lat: 59.3293, lon: 18.0686 },
  { id: "gothenburg", name: "Gothenburg", placeName: "Gothenburg, Sweden", country: "Sweden", countryCode: "SE", lat: 57.7089, lon: 11.9746 },
  { id: "malmo", name: "Malmö", placeName: "Malmö, Sweden", country: "Sweden", countryCode: "SE", lat: 55.605, lon: 13.0038 },
  { id: "uppsala", name: "Uppsala", placeName: "Uppsala, Sweden", country: "Sweden", countryCode: "SE", lat: 59.8586, lon: 17.6389 },
  { id: "umea", name: "Umeå", placeName: "Umeå, Sweden", country: "Sweden", countryCode: "SE", lat: 63.8258, lon: 20.263 },
  { id: "visby", name: "Visby", placeName: "Visby, Sweden", country: "Sweden", countryCode: "SE", lat: 57.6348, lon: 18.2948 },
  { id: "oslo", name: "Oslo", placeName: "Oslo, Norway", country: "Norway", countryCode: "NO", lat: 59.9139, lon: 10.7522 },
  { id: "bergen", name: "Bergen", placeName: "Bergen, Norway", country: "Norway", countryCode: "NO", lat: 60.3913, lon: 5.3221 },
  { id: "trondheim", name: "Trondheim", placeName: "Trondheim, Norway", country: "Norway", countryCode: "NO", lat: 63.4305, lon: 10.3951 },
  { id: "stavanger", name: "Stavanger", placeName: "Stavanger, Norway", country: "Norway", countryCode: "NO", lat: 58.97, lon: 5.7331 },
  { id: "copenhagen", name: "Copenhagen", placeName: "Copenhagen, Denmark", country: "Denmark", countryCode: "DK", lat: 55.6761, lon: 12.5683 },
  { id: "aarhus", name: "Aarhus", placeName: "Aarhus, Denmark", country: "Denmark", countryCode: "DK", lat: 56.1629, lon: 10.2039 },
  { id: "odense", name: "Odense", placeName: "Odense, Denmark", country: "Denmark", countryCode: "DK", lat: 55.4038, lon: 10.4024 },
  { id: "tallinn", name: "Tallinn", placeName: "Tallinn, Estonia", country: "Estonia", countryCode: "EE", lat: 59.437, lon: 24.7536 },
  { id: "tartu", name: "Tartu", placeName: "Tartu, Estonia", country: "Estonia", countryCode: "EE", lat: 58.378, lon: 26.729 },
  { id: "riga", name: "Riga", placeName: "Riga, Latvia", country: "Latvia", countryCode: "LV", lat: 56.9496, lon: 24.1052 },
  { id: "vilnius", name: "Vilnius", placeName: "Vilnius, Lithuania", country: "Lithuania", countryCode: "LT", lat: 54.6872, lon: 25.2797 },
  { id: "kaunas", name: "Kaunas", placeName: "Kaunas, Lithuania", country: "Lithuania", countryCode: "LT", lat: 54.8985, lon: 23.9036 },
  // Europe
  { id: "london", name: "London", placeName: "London, UK", country: "United Kingdom", countryCode: "GB", lat: 51.5074, lon: -0.1278 },
  { id: "manchester", name: "Manchester", placeName: "Manchester, UK", country: "United Kingdom", countryCode: "GB", lat: 53.4808, lon: -2.2426 },
  { id: "edinburgh", name: "Edinburgh", placeName: "Edinburgh, UK", country: "United Kingdom", countryCode: "GB", lat: 55.9533, lon: -3.1883 },
  { id: "dublin", name: "Dublin", placeName: "Dublin, Ireland", country: "Ireland", countryCode: "IE", lat: 53.3498, lon: -6.2603 },
  { id: "amsterdam", name: "Amsterdam", placeName: "Amsterdam, Netherlands", country: "Netherlands", countryCode: "NL", lat: 52.3676, lon: 4.9041 },
  { id: "rotterdam", name: "Rotterdam", placeName: "Rotterdam, Netherlands", country: "Netherlands", countryCode: "NL", lat: 51.9244, lon: 4.4777 },
  { id: "brussels", name: "Brussels", placeName: "Brussels, Belgium", country: "Belgium", countryCode: "BE", lat: 50.8503, lon: 4.3517 },
  { id: "paris", name: "Paris", placeName: "Paris, France", country: "France", countryCode: "FR", lat: 48.8566, lon: 2.3522 },
  { id: "lyon", name: "Lyon", placeName: "Lyon, France", country: "France", countryCode: "FR", lat: 45.764, lon: 4.8357 },
  { id: "nice", name: "Nice", placeName: "Nice, France", country: "France", countryCode: "FR", lat: 43.7102, lon: 7.262 },
  { id: "berlin", name: "Berlin", placeName: "Berlin, Germany", country: "Germany", countryCode: "DE", lat: 52.52, lon: 13.405 },
  { id: "hamburg", name: "Hamburg", placeName: "Hamburg, Germany", country: "Germany", countryCode: "DE", lat: 53.5511, lon: 9.9937 },
  { id: "munich", name: "Munich", placeName: "Munich, Germany", country: "Germany", countryCode: "DE", lat: 48.1351, lon: 11.582 },
  { id: "cologne", name: "Cologne", placeName: "Cologne, Germany", country: "Germany", countryCode: "DE", lat: 50.9375, lon: 6.9603 },
  { id: "frankfurt", name: "Frankfurt", placeName: "Frankfurt, Germany", country: "Germany", countryCode: "DE", lat: 50.1109, lon: 8.6821 },
  { id: "vienna", name: "Vienna", placeName: "Vienna, Austria", country: "Austria", countryCode: "AT", lat: 48.2082, lon: 16.3738 },
  { id: "prague", name: "Prague", placeName: "Prague, Czechia", country: "Czechia", countryCode: "CZ", lat: 50.0755, lon: 14.4378 },
  { id: "warsaw", name: "Warsaw", placeName: "Warsaw, Poland", country: "Poland", countryCode: "PL", lat: 52.2297, lon: 21.0122 },
  { id: "gdansk", name: "Gdańsk", placeName: "Gdańsk, Poland", country: "Poland", countryCode: "PL", lat: 54.352, lon: 18.6466 },
  { id: "budapest", name: "Budapest", placeName: "Budapest, Hungary", country: "Hungary", countryCode: "HU", lat: 47.4979, lon: 19.0402 },
  { id: "zurich", name: "Zurich", placeName: "Zurich, Switzerland", country: "Switzerland", countryCode: "CH", lat: 47.3769, lon: 8.5417 },
  { id: "geneva", name: "Geneva", placeName: "Geneva, Switzerland", country: "Switzerland", countryCode: "CH", lat: 46.2044, lon: 6.1432 },
  { id: "milan", name: "Milan", placeName: "Milan, Italy", country: "Italy", countryCode: "IT", lat: 45.4642, lon: 9.19 },
  { id: "rome", name: "Rome", placeName: "Rome, Italy", country: "Italy", countryCode: "IT", lat: 41.9028, lon: 12.4964 },
  { id: "florence", name: "Florence", placeName: "Florence, Italy", country: "Italy", countryCode: "IT", lat: 43.7696, lon: 11.2558 },
  { id: "venice", name: "Venice", placeName: "Venice, Italy", country: "Italy", countryCode: "IT", lat: 45.4408, lon: 12.3155 },
  { id: "barcelona", name: "Barcelona", placeName: "Barcelona, Spain", country: "Spain", countryCode: "ES", lat: 41.3874, lon: 2.1686 },
  { id: "madrid", name: "Madrid", placeName: "Madrid, Spain", country: "Spain", countryCode: "ES", lat: 40.4168, lon: -3.7038 },
  { id: "valencia", name: "Valencia", placeName: "Valencia, Spain", country: "Spain", countryCode: "ES", lat: 39.4699, lon: -0.3763 },
  { id: "lisbon", name: "Lisbon", placeName: "Lisbon, Portugal", country: "Portugal", countryCode: "PT", lat: 38.7223, lon: -9.1393 },
  { id: "porto", name: "Porto", placeName: "Porto, Portugal", country: "Portugal", countryCode: "PT", lat: 41.1579, lon: -8.6291 },
  { id: "athens", name: "Athens", placeName: "Athens, Greece", country: "Greece", countryCode: "GR", lat: 37.9838, lon: 23.7275 },
  { id: "reykjavik", name: "Reykjavik", placeName: "Reykjavik, Iceland", country: "Iceland", countryCode: "IS", lat: 64.1466, lon: -21.9426 },
  // Wider world (global range)
  { id: "newyork", name: "New York", placeName: "New York, USA", country: "United States", countryCode: "US", lat: 40.7128, lon: -74.006 },
  { id: "boston", name: "Boston", placeName: "Boston, USA", country: "United States", countryCode: "US", lat: 42.3601, lon: -71.0589 },
  { id: "miami", name: "Miami", placeName: "Miami, USA", country: "United States", countryCode: "US", lat: 25.7617, lon: -80.1918 },
  { id: "toronto", name: "Toronto", placeName: "Toronto, Canada", country: "Canada", countryCode: "CA", lat: 43.6532, lon: -79.3832 },
  { id: "vancouver", name: "Vancouver", placeName: "Vancouver, Canada", country: "Canada", countryCode: "CA", lat: 49.2827, lon: -123.1207 },
  { id: "tokyo", name: "Tokyo", placeName: "Tokyo, Japan", country: "Japan", countryCode: "JP", lat: 35.6762, lon: 139.6503 },
  { id: "sydney", name: "Sydney", placeName: "Sydney, Australia", country: "Australia", countryCode: "AU", lat: -33.8688, lon: 151.2093 },
  { id: "auckland", name: "Auckland", placeName: "Auckland, New Zealand", country: "New Zealand", countryCode: "NZ", lat: -36.8509, lon: 174.7645 },
  { id: "cape_town", name: "Cape Town", placeName: "Cape Town, South Africa", country: "South Africa", countryCode: "ZA", lat: -33.9249, lon: 18.4241 },
  { id: "dubai", name: "Dubai", placeName: "Dubai, UAE", country: "United Arab Emirates", countryCode: "AE", lat: 25.2048, lon: 55.2708 },
  { id: "bangkok", name: "Bangkok", placeName: "Bangkok, Thailand", country: "Thailand", countryCode: "TH", lat: 13.7563, lon: 100.5018 },
  { id: "singapore", name: "Singapore", placeName: "Singapore", country: "Singapore", countryCode: "SG", lat: 1.3521, lon: 103.8198 },
];

export const DISTANCE_RADIUS_KM = {
  near: 50,
  region: 300,
  country: 800,
  continent: 2000,
  global: 20000,
} as const;

export type DistanceKey = keyof typeof DISTANCE_RADIUS_KM;

const PLACEHOLDER_IMAGES = [
  "/images/naantali.jpg",
  "/images/stockholm.jpg",
  "/images/copenhagen.jpg",
];

export function placeholderImageFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i) * (i + 1)) % 97;
  return PLACEHOLDER_IMAGES[hash % PLACEHOLDER_IMAGES.length]!;
}

export function citiesWithinRadius(
  origin: { lat: number; lon: number },
  radiusKm: number,
  opts?: { excludeName?: string; limit?: number },
): Array<PlaceDto & { distanceKm: number }> {
  const exclude = opts?.excludeName?.toLowerCase().trim();
  const limit = opts?.limit ?? 40;

  return WORLD_CITIES.map((city) => ({
    ...city,
    distanceKm: haversineKm(origin, city),
  }))
    .filter((city) => {
      if (city.distanceKm < 5) return false; // skip origin itself
      if (exclude && city.name.toLowerCase() === exclude) return false;
      return city.distanceKm <= radiusKm;
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
