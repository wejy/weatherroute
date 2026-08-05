import {
  appleMapsDirectionsUrl,
  googleMapsDirectionsUrl,
  routeFingerprint,
} from "@/lib/route-share";

describe("maps directions URLs", () => {
  const origin = { lat: 60.17, lon: 24.94 };
  const destination = { lat: 61.5, lon: 23.79 };

  it("builds Google Maps URL with driving mode", () => {
    const url = googleMapsDirectionsUrl({
      origin,
      destination,
      mode: "driving",
    });
    expect(url).toContain("https://www.google.com/maps/dir/?");
    expect(url).toContain("origin=60.17%2C24.94");
    expect(url).toContain("destination=61.5%2C23.79");
    expect(url).toContain("travelmode=driving");
  });

  it("builds Apple Maps URL with dirflg=d for driving", () => {
    const url = appleMapsDirectionsUrl({
      origin,
      destination,
      mode: "driving",
    });
    expect(url).toContain("https://maps.apple.com/?");
    expect(url).toContain("saddr=60.17%2C24.94");
    expect(url).toContain("daddr=61.5%2C23.79");
    expect(url).toContain("dirflg=d");
  });

  it("uses dirflg=w for cycling on Apple Maps", () => {
    const url = appleMapsDirectionsUrl({
      origin,
      destination,
      mode: "cycling",
    });
    expect(url).toContain("dirflg=w");
  });

  it("chains midpoints into Apple daddr", () => {
    const url = appleMapsDirectionsUrl({
      origin,
      destination,
      waypoints: [{ lat: 60.5, lon: 24.5 }],
      mode: "driving",
    });
    expect(decodeURIComponent(url)).toContain("60.5,24.5+to:61.5,23.79");
  });
});

describe("routeFingerprint", () => {
  it("keys from|to|mode for dedupe", () => {
    expect(
      routeFingerprint({
        from: "Helsinki",
        to: "Tampere",
        mode: "driving",
      }),
    ).toBe("Helsinki|Tampere|driving");
    expect(routeFingerprint({})).toBe("||driving");
    expect(routeFingerprint(undefined)).toBe("");
  });
});

/** Mirrors consume helpers’ remaining math (anon 30 / free 50 / pro 500). */
function monthlyQuotaStatus(
  used: number,
  limit: number,
  kind: "anon" | "free" | "pro_monthly",
) {
  const remaining = Math.max(0, limit - used);
  return {
    searchesUsed: used,
    limit,
    remaining,
    allowed: remaining > 0,
    kind,
  };
}

describe("route monthly quota math", () => {
  it("allows under limit and denies when exhausted", () => {
    expect(monthlyQuotaStatus(0, 30, "anon").allowed).toBe(true);
    expect(monthlyQuotaStatus(29, 30, "anon").remaining).toBe(1);
    expect(monthlyQuotaStatus(30, 30, "anon").allowed).toBe(false);
    expect(monthlyQuotaStatus(50, 50, "free").allowed).toBe(false);
    expect(monthlyQuotaStatus(499, 500, "pro_monthly").allowed).toBe(true);
    expect(monthlyQuotaStatus(500, 500, "pro_monthly").allowed).toBe(false);
  });
});
