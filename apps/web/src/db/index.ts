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

function createClient(): Db | null {
  if (!hasDatabase()) return null;
  const url = env.databaseUrl;
  if (!url) return null;

  const sql =
    globalForDb.solviaxSql ??
    postgres(url, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.solviaxSql = sql;
  }

  const db =
    globalForDb.solviaxDb ??
    drizzle(sql, { schema });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.solviaxDb = db;
  }

  return db;
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
