import "server-only";

import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import type { UserDto } from "@/lib/types";
import { getCurrentUser } from "@/server/auth/session";
import {
  normalizeUserRole,
  type UserRole,
} from "@/server/admin/role";

export type { UserRole };
export { normalizeUserRole };

export async function getUserRole(userId: string): Promise<UserRole> {
  const db = getDb();
  if (!db) return "user";
  try {
    const [row] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return normalizeUserRole(row?.role);
  } catch {
    return "user";
  }
}

export async function isAdminUser(userId: string): Promise<boolean> {
  return (await getUserRole(userId)) === "admin";
}

/**
 * Server gate for /admin pages. Hides existence with 404 for non-admins.
 */
export async function requireAdminPage(): Promise<UserDto> {
  const user = await getCurrentUser();
  if (!user || !(await isAdminUser(user.id))) {
    notFound();
  }
  return user;
}

/**
 * API gate: returns null when caller is not an admin (respond with 404).
 */
export async function requireAdminApi(): Promise<UserDto | null> {
  const user = await getCurrentUser();
  if (!user || !(await isAdminUser(user.id))) return null;
  return user;
}
