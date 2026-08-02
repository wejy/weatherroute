import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import {
  seedForCountryCode,
  seedFromTimezone,
  toCoarseResult,
  type CoarseGeoResult,
} from "@/lib/coarse-geo";
import { withApiLog } from "@/lib/api-log";

function countryFromHeaders(request: NextRequest): string | null {
  const keys = [
    "x-vercel-ip-country",
    "cf-ipcountry",
    "cloudfront-viewer-country",
  ];
  for (const key of keys) {
    const value = request.headers.get(key);
    if (value && value !== "XX" && value.length === 2) {
      return value.toUpperCase();
    }
  }
  return null;
}

async function lookupIpCountry(ip: string | null): Promise<{
  countryCode?: string;
  city?: string;
  lat?: number;
  lon?: number;
} | null> {
  if (
    !ip ||
    ip === "::1" ||
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.")
  ) {
    return null;
  }

  try {
    const url = new URL(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json", "User-Agent": "WeatherTrip/0.1" },
      signal: AbortSignal.timeout(3500),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      country_code?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
      error?: boolean;
    };
    if (data.error || !data.country_code) return null;
    return {
      countryCode: data.country_code.toUpperCase(),
      city: data.city,
      lat: data.latitude,
      lon: data.longitude,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  return withApiLog(request, "geo.coarse", async ({ log, ip }) => {
    const limited = await rateLimit(`coarse-geo:${ip}`, 40);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const tz = request.nextUrl.searchParams.get("tz") ?? undefined;
    const headerCountry = countryFromHeaders(request);

    let result: CoarseGeoResult | null = null;

    if (headerCountry) {
      result = toCoarseResult(
        seedForCountryCode(headerCountry),
        "header",
        headerCountry,
      );
    }

    if (!result) {
      const lookedUp = await lookupIpCountry(ip === "local" ? null : ip);
      if (lookedUp?.countryCode) {
        const seed = seedForCountryCode(lookedUp.countryCode);
        if (
          lookedUp.city &&
          lookedUp.lat != null &&
          lookedUp.lon != null &&
          Number.isFinite(lookedUp.lat) &&
          Number.isFinite(lookedUp.lon)
        ) {
          result = {
            place: {
              id: `coarse-ip-${lookedUp.countryCode}`,
              name: lookedUp.city,
              placeName: `${lookedUp.city}, ${seed.place.country ?? lookedUp.countryCode}`,
              country: seed.place.country,
              countryCode: lookedUp.countryCode,
              lat: lookedUp.lat,
              lon: lookedUp.lon,
            },
            source: "ip",
            countryCode: lookedUp.countryCode,
            region: seed.region,
            suggestedDistance: seed.suggestedDistance,
            label: `${lookedUp.city}, ${seed.place.country ?? lookedUp.countryCode}`,
          };
        } else {
          result = toCoarseResult(seed, "ip", lookedUp.countryCode);
        }
      }
    }

    if (!result) {
      const fromTz = seedFromTimezone(tz);
      if (fromTz) {
        result = toCoarseResult(fromTz, "timezone");
      }
    }

    if (!result) {
      result = toCoarseResult(seedForCountryCode("FI"), "fallback", "FI");
    }

    log.info(
      {
        source: result.source,
        countryCode: result.countryCode,
        name: result.place.name,
      },
      "coarse geo ok",
    );
    return NextResponse.json(result);
  });
}
