import "server-only";

import { createModuleLogger } from "@/lib/logger";
import cron from "node-cron";
import { env } from "@/lib/env";
import { getDb } from "@/db";
import { fetchWeatherBatch } from "@/server/integrations/weather";
import { selectWarmPlaces } from "@/server/jobs/warm-places";

const log = createModuleLogger("server.jobs.cron");
const globalCron = globalThis as unknown as {
  solviaxCronStarted?: boolean;
};

/**
 * Warm weather_cache for a hybrid set of places (usage + regional + global).
 * @deprecated Prefer warmWeatherCache — kept for call-site compatibility.
 */
export async function warmPopularWeather(limit?: number): Promise<number> {
  return warmWeatherCache(limit);
}

/**
 * Warm weather_cache via fetchWeatherBatch write-through.
 */
export async function warmWeatherCache(
  limit = env.cronWeatherWarmLimit,
): Promise<number> {
  const db = getDb();
  if (!db) {
    log.info("[cron] skip warm — no database");
    return 0;
  }

  const selected = await selectWarmPlaces(limit);
  if (selected.places.length === 0) {
    log.info("[cron] skip warm — no places selected");
    return 0;
  }

  log.info(
    {
      usage: selected.counts.usage,
      regional: selected.counts.regional,
      global: selected.counts.global,
      total: selected.counts.total,
      limit,
    },
    `[cron] warming weather for ${selected.counts.total} places…`,
  );

  const batch = await fetchWeatherBatch(
    selected.places.map((r) => ({ lat: r.lat, lon: r.lon, name: r.name })),
    "en",
  );
  const ok = batch.filter(Boolean).length;
  log.info(`[cron] warm complete: ${ok}/${selected.counts.total}`);
  return ok;
}

export function startCronJobs(): void {
  if (!env.cronEnabled) {
    log.info("[cron] CRON_ENABLED=false — jobs not scheduled");
    return;
  }
  if (globalCron.solviaxCronStarted) return;
  globalCron.solviaxCronStarted = true;

  // 02:00, 10:00, 18:00 UTC — aligns with 12h weather_cache TTL
  cron.schedule("0 2,10,18 * * *", () => {
    void warmWeatherCache().catch((err) =>
      log.error({ err }, "[cron] warm failed"),
    );
  });

  log.info(
    `[cron] scheduled weather warm at 02:00/10:00/18:00 UTC (limit=${env.cronWeatherWarmLimit})`,
  );
}
