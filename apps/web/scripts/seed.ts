import "./load-env";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { places, users, subscriptions } from "../src/db/schema";
import { CITY_INDEX } from "../src/server/integrations/places/city-index";

/** Local / staging Pro accounts (OTP login with this email → Pro features). */
const PRO_SEED_USERS = [
  { email: "felsen@duck.com", name: "felsen" },
] as const;

async function seedProUsers(
  db: ReturnType<typeof drizzle>,
): Promise<void> {
  for (const seed of PRO_SEED_USERS) {
    const email = seed.email.toLowerCase().trim();
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let userId = existing?.id;
    if (!userId) {
      const [created] = await db
        .insert(users)
        .values({
          email,
          name: seed.name,
          emailVerified: new Date(),
        })
        .returning({ id: users.id });
      userId = created?.id;
      console.log(`Created user ${email}`);
    } else {
      await db
        .update(users)
        .set({
          name: existing?.name || seed.name,
          emailVerified: existing?.emailVerified ?? new Date(),
        })
        .where(eq(users.id, userId));
      console.log(`User ${email} already exists (${userId})`);
    }

    if (!userId) {
      console.error(`Failed to ensure user ${email}`);
      continue;
    }

    await db
      .insert(subscriptions)
      .values({
        userId,
        status: "active",
        plan: "monthly",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: {
          status: "active",
          plan: "monthly",
          updatedAt: new Date(),
        },
      });
    console.log(`Pro subscription active for ${email}`);
  }
}

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

  console.log("Seeding Pro users…");
  await seedProUsers(db);

  await sql.end();
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
