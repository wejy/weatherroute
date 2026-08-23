import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hasDatabase, env } from "@/lib/env";
import * as schema from "./schema";

export { schema };

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  solviaxSql?: ReturnType<typeof postgres>;
  solviaxDb?: Db;
};

/**
 * Pool size for the long-lived Next.js process.
 * Small managed plans (e.g. UpCloud 1×CPU / 2GB) often have ~25 max_connections
 * with a few reserved for SUPERUSER — keep this modest.
 */
function poolMax(): number {
  const raw = Number(process.env.DATABASE_POOL_MAX || 5);
  if (!Number.isFinite(raw) || raw < 1) return 5;
  return Math.min(Math.floor(raw), 20);
}

function createClient(): Db | null {
  if (!hasDatabase()) return null;
  const url = env.databaseUrl;
  if (!url) return null;

  // Always reuse one pool (dev + prod). Skipping the cache in production used to
  // create a new max:N pool on every getDb() call and exhaust managed Postgres.
  if (!globalForDb.solviaxSql) {
    globalForDb.solviaxSql = postgres(url, {
      max: poolMax(),
      idle_timeout: 20,
      connect_timeout: 10,
      max_lifetime: 60 * 30,
    });
  }

  if (!globalForDb.solviaxDb) {
    globalForDb.solviaxDb = drizzle(globalForDb.solviaxSql, { schema });
  }

  return globalForDb.solviaxDb;
}

/** Drizzle client when DATABASE_URL is set and USE_MOCKS is false; otherwise null. */
export function getDb(): Db | null {
  if (!hasDatabase()) return null;
  if (!globalForDb.solviaxDb) {
    return createClient();
  }
  return globalForDb.solviaxDb;
}

export function assertDatabaseConfigured(): Db {
  const db = getDb();
  if (!db) {
    throw new Error(
      "DATABASE_URL is not set or USE_MOCKS=true. Start Postgres (docker compose) and set USE_MOCKS=false.",
    );
  }
  return db;
}

export function isDbReady(): boolean {
  return getDb() !== null;
}
