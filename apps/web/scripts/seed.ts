import "./load-env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { places } from "../src/db/schema";
import { CITY_INDEX } from "../src/server/integrations/places/city-index";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);

  const rows = CITY_INDEX.map((city) => ({
    id: city.id,
    name: city.name,
    placeName: city.placeName,
    country: city.country ?? null,
    countryCode: city.countryCode ?? null,
    lat: city.lat,
    lon: city.lon,
    population: city.population,
    kind: "city",
    source: "city_index",
  }));

  console.log(`Seeding ${rows.length} places from CITY_INDEX…`);

  const chunkSize = 50;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    for (const row of chunk) {
      await db
        .insert(places)
        .values(row)
        .onConflictDoUpdate({
          target: places.id,
          set: {
            name: row.name,
            placeName: row.placeName,
            country: row.country,
            countryCode: row.countryCode,
            lat: row.lat,
            lon: row.lon,
            population: row.population,
            kind: row.kind,
            source: row.source,
          },
        });
    }
  }

  await sql.end();
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
