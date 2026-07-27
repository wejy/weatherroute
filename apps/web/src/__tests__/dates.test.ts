import {
  addDays,
  getWeekendBounds,
  listDateKeys,
  maxForecastDateKey,
  minForecastDateKey,
  parseDateKey,
  resolveDateWindow,
  toDateKey,
  weekdayShort,
} from "@/lib/dates";

describe("toDateKey / parseDateKey", () => {
  it("round-trips local calendar dates", () => {
    const d = new Date(2026, 6, 27); // Jul 27 2026 local
    expect(toDateKey(d)).toBe("2026-07-27");
    expect(toDateKey(parseDateKey("2026-07-27"))).toBe("2026-07-27");
  });
});

describe("weekdayShort", () => {
  it("uses English and Finnish abbreviations", () => {
    // 2026-07-27 is a Monday
    expect(weekdayShort("2026-07-27", "en")).toBe("Mon");
    expect(weekdayShort("2026-07-27", "fi")).toBe("ma");
  });
});

describe("getWeekendBounds", () => {
  it("returns Sat–Sun for a midweek day", () => {
    // Wednesday Jul 22 2026
    const { start, end } = getWeekendBounds(new Date(2026, 6, 22));
    expect(toDateKey(start)).toBe("2026-07-25");
    expect(toDateKey(end)).toBe("2026-07-26");
  });

  it("on Saturday returns Sat–Sun", () => {
    const { start, end } = getWeekendBounds(new Date(2026, 6, 25));
    expect(toDateKey(start)).toBe("2026-07-25");
    expect(toDateKey(end)).toBe("2026-07-26");
  });

  it("on Sunday returns Sunday only", () => {
    const { start, end } = getWeekendBounds(new Date(2026, 6, 26));
    expect(toDateKey(start)).toBe("2026-07-26");
    expect(toDateKey(end)).toBe("2026-07-26");
  });
});

describe("resolveDateWindow", () => {
  const now = new Date(2026, 6, 22); // Wed

  it("resolves today as a single day", () => {
    const w = resolveDateWindow({ preset: "today", now, locale: "en" });
    expect(w.startDate).toBe("2026-07-22");
    expect(w.endDate).toBe("2026-07-22");
    expect(w.label).toBe("Today");
  });

  it("resolves tomorrow", () => {
    const w = resolveDateWindow({ preset: "tomorrow", now, locale: "fi" });
    expect(w.startDate).toBe("2026-07-23");
    expect(w.endDate).toBe("2026-07-23");
    expect(w.label).toBe("Huomenna");
  });

  it("resolves weekend as Sat–Sun", () => {
    const w = resolveDateWindow({ preset: "weekend", now });
    expect(w.startDate).toBe("2026-07-25");
    expect(w.endDate).toBe("2026-07-26");
  });

  it("honors custom multi-day range and reorders inverted dates", () => {
    const w = resolveDateWindow({
      preset: "custom",
      startDate: "2026-07-28",
      endDate: "2026-07-26",
      now,
      locale: "en",
    });
    expect(w.startDate).toBe("2026-07-26");
    expect(w.endDate).toBe("2026-07-28");
    expect(w.label).toBe("Custom dates");
  });
});

describe("listDateKeys", () => {
  it("lists inclusive days", () => {
    expect(listDateKeys("2026-07-25", "2026-07-26")).toEqual([
      "2026-07-25",
      "2026-07-26",
    ]);
  });

  it("returns one key for a single day", () => {
    expect(listDateKeys("2026-07-22", "2026-07-22")).toEqual(["2026-07-22"]);
  });
});

describe("forecast date bounds", () => {
  it("spans today through +15 days", () => {
    const now = new Date(2026, 6, 22);
    expect(minForecastDateKey(now)).toBe("2026-07-22");
    expect(maxForecastDateKey(now)).toBe(toDateKey(addDays(now, 15)));
  });
});
