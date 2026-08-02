import "./load-env";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { resolve } from "node:path";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required. Example: postgresql://solviax:solviax@localhost:5432/solviax");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);
  const migrationsFolder = resolve(__dirname, "../drizzle");

  console.log("Running migrations from", migrationsFolder);
  await migrate(db, { migrationsFolder });
  await sql.end();
  console.log("Migrations complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
