import { config } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

// Same paths as scripts/load-env.ts — drizzle-kit does not load Next.js .env.local by itself.
config({ path: resolve(__dirname, ".env.local") });
config({ path: resolve(__dirname, ".env") });

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  throw new Error(
    "DATABASE_URL is required for drizzle-kit. Set it in apps/web/.env.local (e.g. postgresql://solviax:solviax@localhost:5433/solviax).",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
