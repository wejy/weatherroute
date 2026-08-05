/**
 * @jest-environment node
 */

import {
  estimateAdminFinance,
  readAdminCostConfigFromEnv,
  type AdminCostConfig,
} from "@/server/admin/finance";
import { normalizeUserRole } from "@/server/admin/role";
import {
  ADMIN_STATS_MAX_RANGE_DAYS,
  fillDailySeries,
  parseAdminStatsRange,
} from "@/server/admin/range";

const baseConfig: AdminCostConfig = {
  serverMonthlyEur: 15,
  databaseMonthlyEur: 10,
  upstashMonthlyEur: 0,
  otherMonthlyEur: 5,
  openMeteoMonthlyEur: 30,
  mapboxGeocodePer1kEur: 1,
  mapboxDirectionsPer1kEur: 2,
  wikipediaPer1kEur: 0,
  priceMonthlyEur: 2.99,
  priceYearlyEur: 30,
  priceOneTimeEur: 1.99,
  stripePercent: 1.5,
  stripeFixedEur: 0.25,
};

describe("normalizeUserRole", () => {
  it("only treats exact admin as admin", () => {
    expect(normalizeUserRole("admin")).toBe("admin");
    expect(normalizeUserRole("user")).toBe("user");
    expect(normalizeUserRole("Admin")).toBe("user");
    expect(normalizeUserRole(undefined)).toBe("user");
  });
});

describe("parseAdminStatsRange", () => {
  it("defaults to last 30 days and caps at max", () => {
    const now = new Date("2026-07-27T12:00:00.000Z");
    const def = parseAdminStatsRange({ now });
    expect(def.rangeDays).toBe(30);

    const wide = parseAdminStatsRange({
      from: "2024-01-01",
      to: "2026-07-27",
      now,
    });
    expect(wide.rangeDays).toBe(ADMIN_STATS_MAX_RANGE_DAYS);
  });
});

describe("fillDailySeries", () => {
  it("fills missing days with zeros", () => {
    const from = new Date("2026-07-01T00:00:00.000Z");
    const to = new Date("2026-07-04T00:00:00.000Z");
    const filled = fillDailySeries(
      from,
      to,
      [{ day: "2026-07-02", discover: 5, login: 1, route: 0, routeSave: 0 }],
      { discover: 0, login: 0, route: 0, routeSave: 0 },
    );
    expect(filled).toHaveLength(3);
    expect(filled[0]).toEqual({
      day: "2026-07-01",
      discover: 0,
      login: 0,
      route: 0,
      routeSave: 0,
    });
    expect(filled[1]?.discover).toBe(5);
    expect(filled[1]?.login).toBe(1);
  });
});

describe("estimateAdminFinance", () => {
  it("prorates fixed costs and computes net margin", () => {
    const result = estimateAdminFinance({
      rangeDays: 30,
      config: baseConfig,
      external: {
        mapboxGeocode: 1000,
        mapboxDirections: 500,
        openMeteo: 10,
        wikipedia: 100,
      },
      paying: { monthlyActive: 10, yearlyActive: 0, oneTimeActive: 0 },
    });

    expect(result.fixedMonthlyEur).toBe(30);
    expect(result.fixedProratedEur).toBe(30);
    expect(result.openMeteoProratedEur).toBe(30);
    expect(result.variableBreakdown.mapboxGeocodeEur).toBe(1);
    expect(result.variableBreakdown.mapboxDirectionsEur).toBe(1);
    expect(result.revenueGrossEur).toBeCloseTo(29.9);
    expect(result.costsTotalEur).toBe(62);
    expect(result.netMarginEur).toBeCloseTo(
      result.revenueNetEur - result.costsTotalEur,
    );
  });

  it("reads env defaults", () => {
    const cfg = readAdminCostConfigFromEnv({});
    expect(cfg.priceMonthlyEur).toBe(2.99);
    expect(cfg.priceYearlyEur).toBe(30);
    expect(cfg.priceOneTimeEur).toBe(1.99);
    expect(cfg.serverMonthlyEur).toBe(15);
  });
});
