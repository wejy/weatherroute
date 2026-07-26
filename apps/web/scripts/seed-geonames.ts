import "./load-env";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { execFileSync } from "node:child_process";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import { places } from "../src/db/schema";

/**
 * Geonames dump → places upsert.
 *
 * Env:
 *   GEONAMES_FILE=cities15000 | cities5000 | cities500  (default cities15000)
 *   GEONAMES_MIN_POP=0          extra population floor
 *   GEONAMES_CACHE_DIR=apps/web/.cache/geonames
 *
 * IDs: gn-{geonameid} (URL-safe; legacy gn: also resolved at read time).
 */

const FILE = (process.env.GEONAMES_FILE || "cities15000").replace(/\.zip$/i, "");
const MIN_POP = Number(process.env.GEONAMES_MIN_POP || 0);
const CACHE_DIR = resolve(
  process.env.GEONAMES_CACHE_DIR || resolve(__dirname, "../.cache/geonames"),
);
const ZIP_URL = `https://download.geonames.org/export/dump/${FILE}.zip`;
const COUNTRY_URL = "https://download.geonames.org/export/dump/countryInfo.txt";

const FALLBACK_COUNTRIES: Record<string, string> = {
  FI: "Finland",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  DE: "Germany",
  FR: "France",
  GB: "United Kingdom",
  US: "United States",
  EE: "Estonia",
  LV: "Latvia",
  LT: "Lithuania",
};

type PlaceRow = {
  id: string;
  name: string;
  placeName: string;
  country: string | null;
  countryCode: string | null;
  lat: number;
  lon: number;
  population: number;
  kind: string;
  source: string;
};

async function download(url: string, dest: string): Promise<void> {
  if (existsSync(dest)) {
    console.log(`Using cached ${dest}`);
    return;
  }
  console.log(`Downloading ${url}…`);
  const res = await fetch(url, {
    headers: { "User-Agent": "WeatherTrip-seed/0.1" },
  });
  if (!res.ok || !res.body) {
    throw new Error(`Download failed ${res.status} ${url}`);
  }
  await pipeline(
    Readable.fromWeb(res.body as import("stream/web").ReadableStream),
    createWriteStream(dest),
  );
}

function extractTxtFromZip(
  zipPath: string,
  entryName: string,
  outPath: string,
): void {
  if (existsSync(outPath)) {
    console.log(`Using cached ${outPath}`);
    return;
  }
  const buf = execFileSync("unzip", ["-p", zipPath, entryName], {
    maxBuffer: 200 * 1024 * 1024,
  });
  writeFileSync(outPath, buf);
}

function parseCountryInfo(text: string): Record<string, string> {
  const map = { ...FALLBACK_COUNTRIES };
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const cols = line.split("\t");
    const iso = cols[0]?.trim();
    const name = cols[4]?.trim();
    if (iso && name) map[iso] = name;
  }
  return map;
}

function parseCitiesTxt(
  text: string,
  countries: Record<string, string>,
): PlaceRow[] {
  const rows: PlaceRow[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const cols = line.split("\t");
    if (cols.length < 15) continue;

    const geonameId = cols[0]!;
    const name = cols[1]!;
    const lat = Number(cols[4]);
    const lon = Number(cols[5]);
    const featureClass = cols[6];
    const countryCode = (cols[8] || "").trim().toUpperCase() || null;
    const population = Number(cols[14] || 0);

    if (featureClass !== "P") continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (population < MIN_POP) continue;
    if (countryCode === "RU") continue;

    const country = countryCode ? countries[countryCode] ?? countryCode : null;
    const placeName = country ? `${name}, ${country}` : name;

    rows.push({
      id: `gn-${geonameId}`,
      name,
      placeName,
      country,
      countryCode,
      lat,
      lon,
      population: Number.isFinite(population) ? population : 0,
      kind: "city",
      source: "geonames",
    });
  }
  return rows;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  mkdirSync(CACHE_DIR, { recursive: true });
  const zipPath = resolve(CACHE_DIR, `${FILE}.zip`);
  const txtPath = resolve(CACHE_DIR, `${FILE}.txt`);
  const countryPath = resolve(CACHE_DIR, "countryInfo.txt");

  await download(ZIP_URL, zipPath);
  extractTxtFromZip(zipPath, `${FILE}.txt`, txtPath);

  try {
    await download(COUNTRY_URL, countryPath);
  } catch (err) {
    console.warn("[geonames] countryInfo download failed, using fallbacks", err);
  }

  const countries = existsSync(countryPath)
    ? parseCountryInfo(readFileSync(countryPath, "utf8"))
    : FALLBACK_COUNTRIES;

  const parsed = parseCitiesTxt(readFileSync(txtPath, "utf8"), countries);
  console.log(`Parsed ${parsed.length} places from ${FILE} (minPop=${MIN_POP})`);

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  const chunkSize = 250;
  let upserted = 0;
  for (let i = 0; i < parsed.length; i += chunkSize) {
    const chunk = parsed.slice(i, i + chunkSize);
    await db
      .insert(places)
      .values(chunk)
      .onConflictDoUpdate({
        target: places.id,
        set: {
          name: sql`excluded.name`,
          placeName: sql`excluded.place_name`,
          country: sql`excluded.country`,
          countryCode: sql`excluded.country_code`,
          lat: sql`excluded.lat`,
          lon: sql`excluded.lon`,
          population: sql`excluded.population`,
          kind: sql`excluded.kind`,
          source: sql`excluded.source`,
        },
      });
    upserted += chunk.length;
    if (upserted % 2500 === 0 || upserted === parsed.length) {
      console.log(`Upserted ${upserted}/${parsed.length}`);
    }
  }

  const deleted = await client`
    delete from places where upper(country_code) = 'RU'
  `;
  console.log(`Removed blocked country rows (RU): ${deleted.count}`);

  const [{ count }] = await client<{ count: string }[]>`
    select count(*)::text as count from places
  `;
  await client.end();
  console.log(`Geonames seed complete. places table now has ${count} rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
