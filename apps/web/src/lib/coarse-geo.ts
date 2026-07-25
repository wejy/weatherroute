import type { PlaceDto } from "@/lib/types";

export type CoarseRegion =
  | "finland"
  | "nordics"
  | "europe"
  | "north_america"
  | "south_america"
  | "asia"
  | "africa"
  | "oceania"
  | "world";

export type CoarseGeoResult = {
  place: PlaceDto;
  source: "ip" | "header" | "timezone" | "fallback";
  countryCode?: string;
  region: CoarseRegion;
  /** Suggested discover distance for this coarse area. */
  suggestedDistance: "region" | "continent";
  label: string;
};

type RegionSeed = {
  region: CoarseRegion;
  suggestedDistance: "region" | "continent";
  place: PlaceDto;
};

/** Country → coarse search center (capital / major hub). */
const COUNTRY_SEEDS: Record<string, RegionSeed> = {
  FI: {
    region: "finland",
    suggestedDistance: "region",
    place: {
      id: "coarse-fi",
      name: "Helsinki",
      placeName: "Helsinki, Finland",
      country: "Finland",
      countryCode: "FI",
      lat: 60.1699,
      lon: 24.9384,
    },
  },
  SE: {
    region: "nordics",
    suggestedDistance: "region",
    place: {
      id: "coarse-se",
      name: "Stockholm",
      placeName: "Stockholm, Sweden",
      country: "Sweden",
      countryCode: "SE",
      lat: 59.3293,
      lon: 18.0686,
    },
  },
  NO: {
    region: "nordics",
    suggestedDistance: "region",
    place: {
      id: "coarse-no",
      name: "Oslo",
      placeName: "Oslo, Norway",
      country: "Norway",
      countryCode: "NO",
      lat: 59.9139,
      lon: 10.7522,
    },
  },
  DK: {
    region: "nordics",
    suggestedDistance: "region",
    place: {
      id: "coarse-dk",
      name: "Copenhagen",
      placeName: "Copenhagen, Denmark",
      country: "Denmark",
      countryCode: "DK",
      lat: 55.6761,
      lon: 12.5683,
    },
  },
  EE: {
    region: "nordics",
    suggestedDistance: "region",
    place: {
      id: "coarse-ee",
      name: "Tallinn",
      placeName: "Tallinn, Estonia",
      country: "Estonia",
      countryCode: "EE",
      lat: 59.437,
      lon: 24.7536,
    },
  },
  DE: {
    region: "europe",
    suggestedDistance: "continent",
    place: {
      id: "coarse-de",
      name: "Berlin",
      placeName: "Berlin, Germany",
      country: "Germany",
      countryCode: "DE",
      lat: 52.52,
      lon: 13.405,
    },
  },
  GB: {
    region: "europe",
    suggestedDistance: "continent",
    place: {
      id: "coarse-gb",
      name: "London",
      placeName: "London, United Kingdom",
      country: "United Kingdom",
      countryCode: "GB",
      lat: 51.5074,
      lon: -0.1278,
    },
  },
  FR: {
    region: "europe",
    suggestedDistance: "continent",
    place: {
      id: "coarse-fr",
      name: "Paris",
      placeName: "Paris, France",
      country: "France",
      countryCode: "FR",
      lat: 48.8566,
      lon: 2.3522,
    },
  },
  ES: {
    region: "europe",
    suggestedDistance: "continent",
    place: {
      id: "coarse-es",
      name: "Madrid",
      placeName: "Madrid, Spain",
      country: "Spain",
      countryCode: "ES",
      lat: 40.4168,
      lon: -3.7038,
    },
  },
  IT: {
    region: "europe",
    suggestedDistance: "continent",
    place: {
      id: "coarse-it",
      name: "Rome",
      placeName: "Rome, Italy",
      country: "Italy",
      countryCode: "IT",
      lat: 41.9028,
      lon: 12.4964,
    },
  },
  NL: {
    region: "europe",
    suggestedDistance: "continent",
    place: {
      id: "coarse-nl",
      name: "Amsterdam",
      placeName: "Amsterdam, Netherlands",
      country: "Netherlands",
      countryCode: "NL",
      lat: 52.3676,
      lon: 4.9041,
    },
  },
  PL: {
    region: "europe",
    suggestedDistance: "continent",
    place: {
      id: "coarse-pl",
      name: "Warsaw",
      placeName: "Warsaw, Poland",
      country: "Poland",
      countryCode: "PL",
      lat: 52.2297,
      lon: 21.0122,
    },
  },
  US: {
    region: "north_america",
    suggestedDistance: "continent",
    place: {
      id: "coarse-us",
      name: "New York",
      placeName: "New York, United States",
      country: "United States",
      countryCode: "US",
      lat: 40.7128,
      lon: -74.006,
    },
  },
  CA: {
    region: "north_america",
    suggestedDistance: "continent",
    place: {
      id: "coarse-ca",
      name: "Toronto",
      placeName: "Toronto, Canada",
      country: "Canada",
      countryCode: "CA",
      lat: 43.6532,
      lon: -79.3832,
    },
  },
  MX: {
    region: "north_america",
    suggestedDistance: "continent",
    place: {
      id: "coarse-mx",
      name: "Mexico City",
      placeName: "Mexico City, Mexico",
      country: "Mexico",
      countryCode: "MX",
      lat: 19.4326,
      lon: -99.1332,
    },
  },
  BR: {
    region: "south_america",
    suggestedDistance: "continent",
    place: {
      id: "coarse-br",
      name: "São Paulo",
      placeName: "São Paulo, Brazil",
      country: "Brazil",
      countryCode: "BR",
      lat: -23.5505,
      lon: -46.6333,
    },
  },
  JP: {
    region: "asia",
    suggestedDistance: "continent",
    place: {
      id: "coarse-jp",
      name: "Tokyo",
      placeName: "Tokyo, Japan",
      country: "Japan",
      countryCode: "JP",
      lat: 35.6762,
      lon: 139.6503,
    },
  },
  AU: {
    region: "oceania",
    suggestedDistance: "continent",
    place: {
      id: "coarse-au",
      name: "Sydney",
      placeName: "Sydney, Australia",
      country: "Australia",
      countryCode: "AU",
      lat: -33.8688,
      lon: 151.2093,
    },
  },
  ZA: {
    region: "africa",
    suggestedDistance: "continent",
    place: {
      id: "coarse-za",
      name: "Cape Town",
      placeName: "Cape Town, South Africa",
      country: "South Africa",
      countryCode: "ZA",
      lat: -33.9249,
      lon: 18.4241,
    },
  },
};

const REGION_FALLBACKS: Record<CoarseRegion, RegionSeed> = {
  finland: COUNTRY_SEEDS.FI,
  nordics: COUNTRY_SEEDS.SE,
  europe: COUNTRY_SEEDS.DE,
  north_america: COUNTRY_SEEDS.US,
  south_america: COUNTRY_SEEDS.BR,
  asia: COUNTRY_SEEDS.JP,
  africa: COUNTRY_SEEDS.ZA,
  oceania: COUNTRY_SEEDS.AU,
  world: {
    region: "world",
    suggestedDistance: "continent",
    place: {
      id: "coarse-world",
      name: "Helsinki",
      placeName: "Helsinki, Finland",
      country: "Finland",
      countryCode: "FI",
      lat: 60.1699,
      lon: 24.9384,
    },
  },
};

const EUROPE_CODES = new Set([
  "AL","AD","AT","BA","BE","BG","BY","CH","CY","CZ","DE","DK","EE","ES","FI",
  "FR","GB","GR","HR","HU","IE","IS","IT","LI","LT","LU","LV","MC","MD","ME",
  "MK","MT","NL","NO","PL","PT","RO","RS","RU","SE","SI","SK","SM","UA","VA",
  "XK",
]);

const NORDIC_CODES = new Set(["FI", "SE", "NO", "DK", "IS", "EE", "LV", "LT"]);

export function regionForCountryCode(code: string | undefined): CoarseRegion {
  if (!code) return "world";
  const cc = code.toUpperCase();
  if (cc === "FI") return "finland";
  if (NORDIC_CODES.has(cc)) return "nordics";
  if (EUROPE_CODES.has(cc)) return "europe";
  if (["US", "CA", "MX"].includes(cc)) return "north_america";
  if (["BR", "AR", "CL", "CO", "PE"].includes(cc)) return "south_america";
  if (["JP", "CN", "KR", "IN", "TH", "SG", "ID", "PH", "VN"].includes(cc)) {
    return "asia";
  }
  if (["AU", "NZ", "FJ"].includes(cc)) return "oceania";
  if (["ZA", "EG", "NG", "KE", "MA"].includes(cc)) return "africa";
  return "world";
}

export function seedForCountryCode(code: string | undefined): RegionSeed {
  if (!code) return REGION_FALLBACKS.world;
  const cc = code.toUpperCase();
  if (COUNTRY_SEEDS[cc]) return COUNTRY_SEEDS[cc];
  const region = regionForCountryCode(cc);
  return REGION_FALLBACKS[region];
}

/** Browser/device IANA timezone → coarse region (no permission needed). */
export function seedFromTimezone(timeZone: string | undefined): RegionSeed | null {
  if (!timeZone) return null;
  const tz = timeZone.toLowerCase();

  if (tz.includes("helsinki") || tz.includes("mariehamn")) {
    return COUNTRY_SEEDS.FI;
  }
  if (
    tz.includes("stockholm") ||
    tz.includes("oslo") ||
    tz.includes("copenhagen") ||
    tz.includes("reykjavik") ||
    tz.includes("tallinn") ||
    tz.includes("riga") ||
    tz.includes("vilnius")
  ) {
    return seedForCountryCode(
      tz.includes("stockholm")
        ? "SE"
        : tz.includes("oslo")
          ? "NO"
          : tz.includes("copenhagen")
            ? "DK"
            : tz.includes("reykjavik")
              ? "IS"
              : tz.includes("tallinn")
                ? "EE"
                : tz.includes("riga")
                  ? "LV"
                  : "LT",
    );
  }
  if (tz.startsWith("europe/")) return REGION_FALLBACKS.europe;
  if (tz.startsWith("america/")) {
    if (
      tz.includes("sao_paulo") ||
      tz.includes("argentina") ||
      tz.includes("santiago") ||
      tz.includes("bogota") ||
      tz.includes("lima")
    ) {
      return REGION_FALLBACKS.south_america;
    }
    return REGION_FALLBACKS.north_america;
  }
  if (tz.startsWith("asia/")) return REGION_FALLBACKS.asia;
  if (tz.startsWith("africa/")) return REGION_FALLBACKS.africa;
  if (tz.startsWith("australia/") || tz.startsWith("pacific/")) {
    return REGION_FALLBACKS.oceania;
  }
  return null;
}

export function toCoarseResult(
  seed: RegionSeed,
  source: CoarseGeoResult["source"],
  countryCode?: string,
): CoarseGeoResult {
  return {
    place: seed.place,
    source,
    countryCode: countryCode ?? seed.place.countryCode,
    region: seed.region,
    suggestedDistance: seed.suggestedDistance,
    label: seed.place.placeName,
  };
}
