import {
  buildWeatherAdvisories,
  rainIntensityFromMm,
} from "@/lib/weather-advisories";

const t = (key: string, vars?: Record<string, string | number>) => {
  if (!vars) return key;
  return `${key}:${JSON.stringify(vars)}`;
};

describe("rainIntensityFromMm", () => {
  it("treats 1.8 mm as light", () => {
    expect(rainIntensityFromMm(1.8)).toBe("light");
  });
  it("treats 5 mm as moderate", () => {
    expect(rainIntensityFromMm(5)).toBe("moderate");
  });
  it("treats 12 mm as heavy", () => {
    expect(rainIntensityFromMm(12)).toBe("heavy");
  });
});

describe("buildWeatherAdvisories rain intensity", () => {
  it("does not call high POP + low mm heavy rain", () => {
    const advisories = buildWeatherAdvisories(
      {
        rainProbability: 64,
        precipitationMm: 1.8,
        condition: "partly_cloudy",
      },
      t,
    );
    expect(advisories.some((a) => a.id === "rain")).toBe(false);
    expect(advisories.some((a) => a.id === "rain-light")).toBe(true);
    expect(advisories.find((a) => a.id === "rain-light")?.title).toBe(
      "advisory.rainCautionTitle",
    );
  });

  it("marks heavy rain when mm is high", () => {
    const advisories = buildWeatherAdvisories(
      {
        rainProbability: 64,
        precipitationMm: 18,
        condition: "rainy",
      },
      t,
    );
    expect(advisories.some((a) => a.id === "rain")).toBe(true);
    expect(advisories.find((a) => a.id === "rain")?.title).toBe(
      "advisory.rainTitle",
    );
  });
});
