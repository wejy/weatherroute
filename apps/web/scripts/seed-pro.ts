import "./load-env";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { users, subscriptions } from "../src/db/schema";

/** Local / staging Pro accounts (OTP login with this email → Pro features). */
const PRO_SEED_USERS = [
  { email: "felsen@duck.com", name: "felsen" },
] as const;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);

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

  await sql.end();
  console.log("Pro seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
