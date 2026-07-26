import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { TripDto, UserDto } from "@/lib/types";
import { MOCK_TRIPS, MOCK_USER } from "@/server/integrations/mocks/data";
import { getCurrentUser } from "@/server/auth/session";
import { getDb } from "@/db";
import { trips } from "@/db/schema";
import { env, hasDatabase } from "@/lib/env";

/** In-memory store when DATABASE_URL / mocks path. */
const tripStore = new Map<string, TripDto[]>([
  [MOCK_USER.id, [...MOCK_TRIPS]],
]);

function rowToDto(row: typeof trips.$inferSelect): TripDto {
  return {
    id: row.id,
    title: row.title,
    originName: row.originName,
    destinationName: row.destinationName,
    destinationLat: row.destinationLat,
    destinationLon: row.destinationLon,
    weatherGoal: row.weatherGoal ?? "best",
    distanceKm: row.distanceKm ?? 0,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getProfileDto(): Promise<UserDto | null> {
  return getCurrentUser();
}

export async function listTripsForUser(userId: string): Promise<TripDto[]> {
  const db = getDb();
  if (!db || env.useMocks || !hasDatabase()) {
    return tripStore.get(userId) ?? [];
  }

  const rows = await db
    .select()
    .from(trips)
    .where(eq(trips.userId, userId))
    .orderBy(desc(trips.createdAt));

  return rows.map(rowToDto);
}

export async function createTrip(
  userId: string,
  input: Omit<TripDto, "id" | "createdAt">,
): Promise<TripDto> {
  const db = getDb();
  if (!db || env.useMocks || !hasDatabase()) {
    const trip: TripDto = {
      ...input,
      id: nanoid(),
      createdAt: new Date().toISOString(),
    };
    const existing = tripStore.get(userId) ?? [];
    tripStore.set(userId, [trip, ...existing]);
    return trip;
  }

  const [row] = await db
    .insert(trips)
    .values({
      userId,
      title: input.title,
      originName: input.originName,
      destinationName: input.destinationName,
      destinationLat: input.destinationLat,
      destinationLon: input.destinationLon,
      weatherGoal: input.weatherGoal,
      distanceKm: input.distanceKm,
    })
    .returning();

  if (!row) throw new Error("Failed to create trip");
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
