function gridKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

export type WarmPlace = {
  lat: number;
  lon: number;
  name?: string;
  source: "usage" | "regional" | "global";
};

export type WarmPlaceSelection = {
  places: WarmPlace[];
  counts: {
    usage: number;
    regional: number;
    global: number;
    total: number;
  };
};

/**
 * Merge candidates in priority order (usage → regional → global),
 * deduped by weather grid key, up to `limit`.
 */
export function mergeWarmCandidates(
  usage: WarmPlace[],
  regional: WarmPlace[],
  global: WarmPlace[],
  limit: number,
): WarmPlaceSelection {
  const seen = new Set<string>();
  const out: WarmPlace[] = [];
  const counts = { usage: 0, regional: 0, global: 0, total: 0 };

  function take(list: WarmPlace[], bucket: "usage" | "regional" | "global") {
    for (const p of list) {
      if (out.length >= limit) return;
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue;
      const key = gridKey(p.lat, p.lon);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
      counts[bucket] += 1;
    }
  }

  take(usage, "usage");
  take(regional, "regional");
  take(global, "global");
  counts.total = out.length;
  return { places: out, counts };
}
