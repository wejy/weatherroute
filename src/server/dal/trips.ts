import "server-only";

import { nanoid } from "nanoid";
import type { TripDto, UserDto } from "@/lib/types";
import { MOCK_TRIPS, MOCK_USER } from "@/server/integrations/mocks/data";
import { getCurrentUser } from "@/server/auth/session";

/** In-memory store for MVP without DATABASE_URL. */
const tripStore = new Map<string, TripDto[]>([
  [MOCK_USER.id, [...MOCK_TRIPS]],
]);

export async function getProfileDto(): Promise<UserDto | null> {
  return getCurrentUser();
}

export async function listTripsForUser(userId: string): Promise<TripDto[]> {
  return tripStore.get(userId) ?? [];
}

export async function createTrip(
  userId: string,
  input: Omit<TripDto, "id" | "createdAt">,
): Promise<TripDto> {
  const trip: TripDto = {
    ...input,
    id: nanoid(),
    createdAt: new Date().toISOString(),
  };
  const existing = tripStore.get(userId) ?? [];
  tripStore.set(userId, [trip, ...existing]);
  return trip;
}

export async function deleteTrip(userId: string, tripId: string): Promise<boolean> {
  const existing = tripStore.get(userId) ?? [];
  const next = existing.filter((t) => t.id !== tripId);
  tripStore.set(userId, next);
  return next.length !== existing.length;
}
