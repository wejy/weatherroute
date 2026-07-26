import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hasDatabase, env } from "@/lib/env";
import * as schema from "./schema";

export { schema };

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  weathertripSql?: ReturnType<typeof postgres>;
  weathertripDb?: Db;
};

function createClient(): Db | null {
  if (!hasDatabase()) return null;
  const url = env.databaseUrl;
  if (!url) return null;

  const sql =
    globalForDb.weathertripSql ??
    postgres(url, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.weathertripSql = sql;
  }

  const db =
    globalForDb.weathertripDb ??
    drizzle(sql, { schema });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.weathertripDb = db;
  }

  return db;
}

/** Drizzle client when DATABASE_URL is set and USE_MOCKS is false; otherwise null. */
export function getDb(): Db | null {
  if (!hasDatabase()) return null;
  if (!globalForDb.weathertripDb) {
    return createClient();
  }
  return globalForDb.weathertripDb;
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
