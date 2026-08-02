/**
 * Geographic diversity for discover: sample near / mid / far rings of the
 * search radius before weather ranking (avoids nearest-only shortlists).
 */

function byPopulationThenDistance<
  T extends { population: number; distanceKm: number },
>(a: T, b: T): number {
  return b.population - a.population || a.distanceKm - b.distanceKm;
}

/**
 * Split limit across near / mid / far thirds of the search radius.
 * Remainder prefers mid → far → near when multiple bands are non-empty.
 */
export function allocateDistanceBandQuotas(
  limit: number,
  nonEmpty: readonly [boolean, boolean, boolean],
): [number, number, number] {
  const activeIdx = [0, 1, 2].filter((i) => nonEmpty[i]);
  if (activeIdx.length === 0 || limit <= 0) return [0, 0, 0];

  const quotas: [number, number, number] = [0, 0, 0];
  const base = Math.floor(limit / activeIdx.length);
  let rem = limit - base * activeIdx.length;
  const remOrder = activeIdx.slice().sort((a, b) => {
    const pref = [1, 2, 0]; // mid, far, near
    return pref.indexOf(a) - pref.indexOf(b);
  });
  for (const i of activeIdx) quotas[i as 0 | 1 | 2] = base;
  for (const i of remOrder) {
    if (rem <= 0) break;
    quotas[i as 0 | 1 | 2] += 1;
    rem -= 1;
  }
  return quotas;
}

/**
 * Pick up to `limit` candidates from near (0–⅓), mid (⅓–⅔), and far (⅔–1)
 * rings of `radiusKm`. Within each band: higher population first.
 * Leftover slots fill from remaining places (mid → far → near).
 */
export function selectAcrossDistanceBands<
  T extends { id: string; population: number; distanceKm: number },
>(candidates: T[], radiusKm: number, limit: number): T[] {
  if (limit <= 0) return [];
  if (candidates.length <= limit || radiusKm <= 0) {
    return candidates.slice(0, limit);
  }

  const nearMax = radiusKm / 3;
  const midMax = (radiusKm * 2) / 3;
  const near: T[] = [];
  const mid: T[] = [];
  const far: T[] = [];

  for (const c of candidates) {
    if (c.distanceKm <= nearMax) near.push(c);
    else if (c.distanceKm <= midMax) mid.push(c);
    else far.push(c);
  }

  near.sort(byPopulationThenDistance);
  mid.sort(byPopulationThenDistance);
  far.sort(byPopulationThenDistance);

  const quotas = allocateDistanceBandQuotas(limit, [
    near.length > 0,
    mid.length > 0,
    far.length > 0,
  ]);

  const picked: T[] = [];
  const seen = new Set<string>();

  const take = (pool: T[], n: number) => {
    let left = n;
    for (const c of pool) {
      if (left <= 0) break;
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      picked.push(c);
      left -= 1;
    }
    return left;
  };

  take(near, quotas[0]);
  take(mid, quotas[1]);
  take(far, quotas[2]);

  if (picked.length < limit) {
    const rest = [...mid, ...far, ...near]
      .filter((c) => !seen.has(c.id))
      .sort(byPopulationThenDistance);
    take(rest, limit - picked.length);
  }

  return picked;
}
