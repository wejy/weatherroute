import "server-only";

import { hasDatabase } from "@/lib/env";
import * as schema from "./schema";

export { schema };

/**
 * Drizzle client placeholder. Install `postgres` and set DATABASE_URL
 * when connecting to Supabase. Until then, use `src/server/dal`.
 */
export function assertDatabaseConfigured() {
  if (!hasDatabase()) {
    throw new Error(
      "DATABASE_URL is not set. Using in-memory DAL; configure Supabase Postgres to enable Drizzle.",
    );
  }
}
