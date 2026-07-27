/**
 * @jest-environment node
 */
jest.mock("@/db", () => require("./mocks/db"));

import { dedupePlaceCandidates } from "@/server/dal/places";

describe("dedupePlaceCandidates", () => {
  it("keeps first of duplicate ids", () => {
    const out = dedupePlaceCandidates([
      { id: "a", name: "Helsinki", lat: 60.17, lon: 24.94 },
      { id: "a", name: "Helsinki City", lat: 60.18, lon: 24.95 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.name).toBe("Helsinki");
  });

  it("drops same settlement name ignoring diacritics/case", () => {
    const out = dedupePlaceCandidates([
      { id: "1", name: "Jyväskylä", lat: 62.24, lon: 25.75 },
      { id: "2", name: "Jyvaskyla", lat: 62.3, lon: 25.8 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe("1");
  });

  it("drops near-identical coordinates (~1 km cell)", () => {
    const out = dedupePlaceCandidates([
      { id: "1", name: "A", lat: 60.169, lon: 24.938 },
      { id: "2", name: "B", lat: 60.171, lon: 24.941 },
    ]);
    expect(out).toHaveLength(1);
  });

  it("keeps distinct places", () => {
    const out = dedupePlaceCandidates([
      { id: "1", name: "Helsinki", lat: 60.17, lon: 24.94 },
      { id: "2", name: "Espoo", lat: 60.205, lon: 24.656 },
      { id: "3", name: "Tampere", lat: 61.5, lon: 23.8 },
    ]);
    expect(out.map((p) => p.id)).toEqual(["1", "2", "3"]);
  });
});
