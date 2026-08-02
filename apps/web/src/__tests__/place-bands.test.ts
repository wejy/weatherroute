/**
 * @jest-environment node
 */

import {
  allocateDistanceBandQuotas,
  selectAcrossDistanceBands,
} from "@/server/dal/place-candidate-select";

describe("allocateDistanceBandQuotas", () => {
  it("splits evenly across three non-empty bands", () => {
    expect(allocateDistanceBandQuotas(12, [true, true, true])).toEqual([
      4, 4, 4,
    ]);
  });

  it("gives remainder to mid then far", () => {
    expect(allocateDistanceBandQuotas(14, [true, true, true])).toEqual([
      4, 5, 5,
    ]);
  });

  it("puts all slots in the only non-empty band", () => {
    expect(allocateDistanceBandQuotas(10, [false, true, false])).toEqual([
      0, 10, 0,
    ]);
  });
});

describe("selectAcrossDistanceBands", () => {
  const radius = 300;
  const mk = (
    id: string,
    distanceKm: number,
    population: number,
  ) => ({ id, distanceKm, population });

  it("pulls from near, mid, and far rings", () => {
    const pool = [
      // near 0–100
      mk("n1", 20, 50_000),
      mk("n2", 40, 40_000),
      mk("n3", 60, 30_000),
      mk("n4", 80, 20_000),
      // mid 100–200
      mk("m1", 120, 200_000),
      mk("m2", 150, 90_000),
      mk("m3", 180, 80_000),
      // far 200–300
      mk("f1", 220, 300_000),
      mk("f2", 250, 100_000),
      mk("f3", 280, 70_000),
    ];

    const picked = selectAcrossDistanceBands(pool, radius, 9);
    expect(picked).toHaveLength(9);

    const dists = picked.map((p) => p.distanceKm);
    expect(dists.some((d) => d <= 100)).toBe(true);
    expect(dists.some((d) => d > 100 && d <= 200)).toBe(true);
    expect(dists.some((d) => d > 200)).toBe(true);
  });

  it("does not collapse to only nearest when far towns exist", () => {
    const pool = [
      ...Array.from({ length: 20 }, (_, i) =>
        mk(`near-${i}`, 10 + i, 500_000 - i * 1000),
      ),
      mk("far-big", 250, 400_000),
      mk("mid-big", 150, 350_000),
    ];

    const picked = selectAcrossDistanceBands(pool, radius, 12);
    const ids = new Set(picked.map((p) => p.id));
    expect(ids.has("far-big")).toBe(true);
    expect(ids.has("mid-big")).toBe(true);
  });

  it("prefers higher population inside a band", () => {
    const pool = [
      mk("near-small", 30, 10_000),
      mk("near-big", 50, 200_000),
      mk("mid-a", 140, 50_000),
      mk("far-a", 240, 50_000),
    ];
    const picked = selectAcrossDistanceBands(pool, radius, 3);
    const nearPick = picked.find((p) => p.distanceKm <= 100);
    expect(nearPick?.id).toBe("near-big");
  });
});
