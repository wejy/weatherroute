/**
 * Clear cached place thumbnails so the next discover/destination load
 * re-resolves images (Wikipedia place filter → Mapbox Static → placeholder).
 *
 * Usage (from apps/web):
 *   npx tsx scripts/clear-place-thumbnails.ts
 *   npx tsx scripts/clear-place-thumbnails.ts --all   # also wipe wiki extract cache
 */
import "./load-env";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "DATABASE_URL is required. Example: postgresql://solviax:solviax@localhost:5433/solviax",
    );
    process.exit(1);
  }

  const wipeAll = process.argv.includes("--all");
  const sql = postgres(url, { max: 1 });

  try {
    const before = await sql<{ n: number }[]>`
      SELECT count(*)::int AS n
      FROM place_extras
      WHERE thumbnail_url IS NOT NULL
    `;
    const withThumbs = before[0]?.n ?? 0;

    if (wipeAll) {
      const result = await sql`
        UPDATE place_extras
        SET
          thumbnail_url = NULL,
          wikipedia_url = NULL,
          wikipedia_lang = NULL,
          extract_short = NULL,
          fetched_at = NOW()
      `;
      console.log(
        `Cleared thumbnails + Wikipedia cache on ${result.count} place_extras row(s) (${withThumbs} had thumbnails).`,
      );
    } else {
      const result = await sql`
        UPDATE place_extras
        SET thumbnail_url = NULL, fetched_at = NOW()
        WHERE thumbnail_url IS NOT NULL
      `;
      console.log(
        `Cleared thumbnail_url on ${result.count} place_extras row(s).`,
      );
      console.log(
        "Tip: pass --all to also clear Wikipedia extracts (forces full re-resolve).",
      );
    }

    console.log(
      "Restart `npm run dev:web` if it was running — in-memory Wikipedia cache lives in the Node process.",
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
