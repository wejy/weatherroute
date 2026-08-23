import { resolveOpenMeteoForecastBaseUrl } from "@/lib/env";

describe("resolveOpenMeteoForecastBaseUrl", () => {
  it("uses free host without an API key", () => {
    expect(resolveOpenMeteoForecastBaseUrl({ apiKey: "" })).toBe(
      "https://api.open-meteo.com",
    );
  });

  it("uses customer host when an API key is set", () => {
    expect(
      resolveOpenMeteoForecastBaseUrl({ apiKey: "test-key-abc" }),
    ).toBe("https://customer-api.open-meteo.com");
  });

  it("honours an explicit base URL override", () => {
    expect(
      resolveOpenMeteoForecastBaseUrl({
        apiKey: "test-key",
        baseUrlOverride: "https://customer-api.open-meteo.com/",
      }),
    ).toBe("https://customer-api.open-meteo.com");
  });
});
