import "server-only";

import { desc } from "drizzle-orm";
import cron from "node-cron";
import { env } from "@/lib/env";
import { getDb } from "@/db";
import { places } from "@/db/schema";
import { fetchWeatherBatch } from "@/server/integrations/weather";

const globalCron = globalThis as unknown as {
  weathertripCronStarted?: boolean;
};

/**
 * Nightly warm of top places into weather_cache (via fetchWeatherBatch write-through).
 */
export async function warmPopularWeather(limit = 200): Promise<number> {
  const db = getDb();
  if (!db) {
    console.info("[cron] skip warm — no database");
    return 0;
  }

  const rows = await db
    .select({
      lat: places.lat,
      lon: places.lon,
      name: places.placeName,
      population: places.population,
    })
    .from(places)
    .orderBy(desc(places.population))
    .limit(limit);

  if (rows.length === 0) return 0;

  console.info(`[cron] warming weather for ${rows.length} places…`);
  const batch = await fetchWeatherBatch(
    rows.map((r) => ({ lat: r.lat, lon: r.lon, name: r.name })),
    "en",
  );
  const ok = batch.filter(Boolean).length;
  console.info(`[cron] warm complete: ${ok}/${rows.length}`);
  return ok;
}

export function startCronJobs(): void {
  if (!env.cronEnabled) {
    console.info("[cron] CRON_ENABLED=false — jobs not scheduled");
    return;
  }
  if (globalCron.weathertripCronStarted) return;
  globalCron.weathertripCronStarted = true;

  // 02:00 UTC daily
  cron.schedule("0 2 * * *", () => {
    void warmPopularWeather(250).catch((err) =>
      console.error("[cron] warm failed", err),
    );
  });

  console.info("[cron] scheduled nightly weather warm at 02:00 UTC");
}
