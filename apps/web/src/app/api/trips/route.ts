import { NextRequest, NextResponse } from "next/server";
import { withApiLog } from "@/lib/api-log";
import { rateLimit } from "@/lib/rate-limit";
import { saveTripInputSchema } from "@/lib/validation/schemas";
import { getCurrentUser } from "@/server/auth/session";
import {
  createTrip,
  listTripsForUser,
  TripSaveLimitError,
} from "@/server/dal/trips";
import { isTravelMode, type TravelMode } from "@/lib/types";

export async function GET(request: NextRequest) {
  return withApiLog(request, "trips.list", async ({ log, ip }) => {
    const limited = await rateLimit(`trips:${ip}`, 60);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const modeRaw = request.nextUrl.searchParams.get("mode");
    const mode =
      modeRaw && isTravelMode(modeRaw) ? (modeRaw as TravelMode) : "all";

    const trips = await listTripsForUser(user.id, { mode });
    log.info({ userId: user.id, count: trips.length }, "trips listed");
    return NextResponse.json({ trips });
  });
}

export async function POST(request: NextRequest) {
  return withApiLog(request, "trips.create", async ({ log, ip }) => {
    const limited = await rateLimit(`trips-write:${ip}`, 30);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (body && typeof body === "object") {
      const raw = body as Record<string, unknown>;
      if ("departureStartHour" in raw) {
        raw.departureStartHour = parseJsonHour(raw.departureStartHour);
      }
      if ("departureEndHour" in raw) {
        raw.departureEndHour = parseJsonHour(raw.departureEndHour);
      }
    }

    const parsed = saveTripInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid trip data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    try {
      const trip = await createTrip(user.id, parsed.data);
      log.info({ userId: user.id, tripId: trip.id }, "trip saved");
      return NextResponse.json({ trip }, { status: 201 });
    } catch (err) {
      if (err instanceof TripSaveLimitError) {
        return NextResponse.json(
          {
            error: "TRIP_LIMIT",
            message: err.message,
            maxSavedTrips: err.maxSavedTrips,
            savedTripCount: err.savedTripCount,
          },
          { status: 402 },
        );
      }
      throw err;
    }
  });
}

function parseJsonHour(value: unknown): number | null {
  if (value == null || value === "" || value === "any") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 23) return null;
  return n;
}
