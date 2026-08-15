import { mergeWarmCandidates, type WarmPlace } from "@/server/jobs/warm-places-merge";

describe("mergeWarmCandidates", () => {
  const usage: WarmPlace[] = [
    { lat: 65.01, lon: 25.47, name: "Oulu", source: "usage" },
    { lat: 60.17, lon: 24.94, name: "Helsinki", source: "usage" },
  ];
  const regional: WarmPlace[] = [
    { lat: 60.17, lon: 24.94, name: "Helsinki dup", source: "regional" },
    { lat: 59.33, lon: 18.07, name: "Stockholm", source: "regional" },
  ];
  const global: WarmPlace[] = [
    { lat: 52.52, lon: 13.41, name: "Berlin", source: "global" },
    { lat: 48.86, lon: 2.35, name: "Paris", source: "global" },
    { lat: 40.71, lon: -74.01, name: "NYC", source: "global" },
  ];

  it("prefers usage, then regional, then global, with grid dedupe", () => {
    const { places, counts } = mergeWarmCandidates(
      usage,
      regional,
      global,
      10,
    );
    expect(places.map((p) => p.name)).toEqual([
      "Oulu",
      "Helsinki",
      "Stockholm",
      "Berlin",
      "Paris",
      "NYC",
    ]);
    expect(counts).toEqual({
      usage: 2,
      regional: 1,
      global: 3,
      total: 6,
    });
  });

  it("respects the hard limit", () => {
    const { places, counts } = mergeWarmCandidates(
      usage,
      regional,
      global,
      3,
    );
    expect(places).toHaveLength(3);
    expect(counts.total).toBe(3);
    expect(counts.usage).toBe(2);
    expect(counts.regional).toBe(1);
    expect(counts.global).toBe(0);
  });

  it("skips invalid coordinates", () => {
    const { places } = mergeWarmCandidates(
      [{ lat: Number.NaN, lon: 0, source: "usage" }],
      [],
      [{ lat: 1, lon: 2, name: "ok", source: "global" }],
      5,
    );
    expect(places).toHaveLength(1);
    expect(places[0]?.name).toBe("ok");
  });
});
