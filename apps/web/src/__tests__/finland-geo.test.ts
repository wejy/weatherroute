/**
 * @jest-environment node
 */

import {
  coordsInFinland,
  isLikelyFinlandOrigin,
} from "@/lib/finland-geo";

describe("finland-geo", () => {
  it("recognizes Helsinki coords as Finland", () => {
    expect(coordsInFinland(60.17, 24.94)).toBe(true);
    expect(isLikelyFinlandOrigin({ lat: 60.17, lon: 24.94 })).toBe(true);
  });

  it("rejects Stockholm coords", () => {
    expect(coordsInFinland(59.33, 18.07)).toBe(false);
    expect(
      isLikelyFinlandOrigin({
        name: "Stockholm, Sweden",
        lat: 59.33,
        lon: 18.07,
      }),
    ).toBe(false);
  });

  it("uses country code when present", () => {
    expect(isLikelyFinlandOrigin({ countryCode: "FI" })).toBe(true);
    expect(isLikelyFinlandOrigin({ countryCode: "DE", name: "Berlin" })).toBe(
      false,
    );
  });

  it("treats bare Finnish city names as Finland", () => {
    expect(isLikelyFinlandOrigin({ name: "Tampere" })).toBe(true);
  });
});
