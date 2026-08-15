import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { TripDto, UserDto, TravelMode } from "@/lib/types";
import { isTravelMode } from "@/lib/types";
import { MOCK_TRIPS, MOCK_USER } from "@/server/integrations/mocks/data";
import { getCurrentUser } from "@/server/auth/session";
import { getDb } from "@/db";
import { subscriptions, trips } from "@/db/schema";
import { env, hasDatabase } from "@/lib/env";
import {
  maxSavedTripsForPlan,
  subscriptionGrantsPro,
} from "@/server/billing/plans";
import { isAdminUser } from "@/server/dal/roles";
import { recordUsageEvent } from "@/server/dal/usage";
import { USAGE_TYPES } from "@/server/dal/usage-types";

/** In-memory store when DATABASE_URL / mocks path. */
const tripStore = new Map<string, TripDto[]>([
  [MOCK_USER.id, [...MOCK_TRIPS]],
]);

function normalizeDepartureHour(
  value: number | null | undefined,
): number | null {
  if (value == null || !Number.isInteger(value) || value < 0 || value > 23) {
    return null;
  }
  return value;
}

function rowToDto(row: typeof trips.$inferSelect): TripDto {
  return {
    id: row.id,
    title: row.title,
    originName: row.originName,
    destinationName: row.destinationName,
    destinationLat: row.destinationLat,
    destinationLon: row.destinationLon,
    originLat: row.originLat,
    originLon: row.originLon,
    weatherGoal: row.weatherGoal ?? "best",
    travelMode: row.travelMode ?? "driving",
    datePreset: row.datePreset,
    startDate: row.startDate,
    endDate: row.endDate,
    departureStartHour: row.departureStartHour,
    departureEndHour: row.departureEndHour,
    distanceKm: row.distanceKm ?? 0,
    durationLabel: row.durationLabel,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getProfileDto(): Promise<UserDto | null> {
  return getCurrentUser();
}

export async function listTripsForUser(
  userId: string,
  opts?: { mode?: TravelMode | "all" },
): Promise<TripDto[]> {
  const modeFilter =
    opts?.mode && opts.mode !== "all" && isTravelMode(opts.mode)
      ? opts.mode
      : null;

  const db = getDb();
  if (!db || env.useMocks || !hasDatabase()) {
    const all = tripStore.get(userId) ?? [];
    if (!modeFilter) return all;
    return all.filter((t) => (t.travelMode ?? "driving") === modeFilter);
  }

  const rows = await db
    .select()
    .from(trips)
    .where(
      modeFilter
        ? and(eq(trips.userId, userId), eq(trips.travelMode, modeFilter))
        : eq(trips.userId, userId),
    )
    .orderBy(desc(trips.createdAt));

  return rows.map(rowToDto);
}

export type CreateTripInput = Omit<TripDto, "id" | "createdAt">;

export class TripSaveLimitError extends Error {
  readonly code = "trip_limit" as const;
  constructor(
    message: string,
    readonly maxSavedTrips: number | null,
    readonly savedTripCount: number,
  ) {
    super(message);
    this.name = "TripSaveLimitError";
  }
}

export async function createTrip(
  userId: string,
  input: CreateTripInput,
): Promise<TripDto> {
  const db = getDb();
  const mocks = !db || env.useMocks || !hasDatabase();
  const travelMode = isTravelMode(input.travelMode)
    ? input.travelMode
    : "driving";

  if (mocks) {
    const trip: TripDto = {
      ...input,
      travelMode,
      departureStartHour: normalizeDepartureHour(input.departureStartHour),
      departureEndHour: normalizeDepartureHour(input.departureEndHour),
      id: nanoid(),
      createdAt: new Date().toISOString(),
    };
    const existing = tripStore.get(userId) ?? [];
    tripStore.set(userId, [trip, ...existing]);
    return trip;
  }

  if (!db) throw new Error("Database required");

  const values = {
    userId,
    title: input.title,
    originName: input.originName,
    destinationName: input.destinationName,
    destinationLat: input.destinationLat,
    destinationLon: input.destinationLon,
    originLat: input.originLat ?? null,
    originLon: input.originLon ?? null,
    weatherGoal: input.weatherGoal ?? null,
    travelMode,
    datePreset: input.datePreset ?? null,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    departureStartHour: normalizeDepartureHour(input.departureStartHour),
    departureEndHour: normalizeDepartureHour(input.departureEndHour),
    distanceKm:
      input.distanceKm != null ? Math.round(Number(input.distanceKm)) : null,
    durationLabel: input.durationLabel ?? null,
  };

  const admin = await isAdminUser(userId);

  /** Serialize saves per user (closes check-then-insert TOCTOU). */
  const row = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);

    const [countRow] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(trips)
      .where(eq(trips.userId, userId));
    const savedTripCount = Number(countRow?.count ?? 0);

    if (!admin) {
      const [sub] = await tx
        .select({
          status: subscriptions.status,
          plan: subscriptions.plan,
          oneTimePaidAt: subscriptions.oneTimePaidAt,
        })
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1);

      const plan = sub?.plan ?? "none";
      const status = sub?.status ?? "free";
      const oneTimePaidAt = sub?.oneTimePaidAt ?? null;
      const pro = subscriptionGrantsPro({ status, plan, oneTimePaidAt });
      const maxSaved = maxSavedTripsForPlan(plan, status, oneTimePaidAt);
      const canSave =
        maxSaved === null ? pro : Boolean(pro && savedTripCount < maxSaved);

      if (!canSave) {
        throw new TripSaveLimitError(
          "Saved route limit reached for your plan",
          maxSaved,
          savedTripCount,
        );
      }
    }

    const [inserted] = await tx.insert(trips).values(values).returning();
    return inserted;
  });

  if (!row) throw new Error("Failed to create trip");
  recordUsageEvent({
    type: USAGE_TYPES.routeSave,
    userId,
    meta: { tripId: row.id },
  });
  return rowToDto(row);
}

export async function deleteTrip(userId: string, tripId: string): Promise<boolean> {
  const db = getDb();
  if (!db || env.useMocks || !hasDatabase()) {
    const existing = tripStore.get(userId) ?? [];
    const next = existing.filter((t) => t.id !== tripId);
    tripStore.set(userId, next);
    return next.length !== existing.length;
  }

  const deleted = await db
    .delete(trips)
    .where(and(eq(trips.id, tripId), eq(trips.userId, userId)))
    .returning({ id: trips.id });

  return deleted.length > 0;
}
