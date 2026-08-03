/**
 * Pure finance estimates for the admin dashboard (EUR).
 * Not accounting-grade — unit costs and fixed ops come from env.
 */

export type AdminCostConfig = {
  serverMonthlyEur: number;
  databaseMonthlyEur: number;
  upstashMonthlyEur: number;
  otherMonthlyEur: number;
  openMeteoMonthlyEur: number;
  mapboxGeocodePer1kEur: number;
  mapboxDirectionsPer1kEur: number;
  wikipediaPer1kEur: number;
  priceMonthlyEur: number;
  priceOneTimeEur: number;
  stripePercent: number;
  stripeFixedEur: number;
};

export type ExternalUsageCounts = {
  mapboxGeocode: number;
  mapboxDirections: number;
  openMeteo: number;
  wikipedia: number;
};

export type PayingCustomers = {
  monthlyActive: number;
  oneTimeActive: number;
};

export type FinanceEstimate = {
  rangeDays: number;
  fixedMonthlyEur: number;
  fixedProratedEur: number;
  openMeteoProratedEur: number;
  variableApiEur: number;
  variableBreakdown: {
    mapboxGeocodeEur: number;
    mapboxDirectionsEur: number;
    wikipediaEur: number;
  };
  costsTotalEur: number;
  revenueGrossEur: number;
  stripeFeesEur: number;
  revenueNetEur: number;
  netMarginEur: number;
  paying: PayingCustomers;
  prices: {
    monthlyEur: number;
    oneTimeEur: number;
  };
};

function per1k(count: number, ratePer1k: number): number {
  return (count / 1000) * ratePer1k;
}

function stripeFeeForCharge(
  amountEur: number,
  percent: number,
  fixedEur: number,
): number {
  return amountEur * (percent / 100) + fixedEur;
}

/**
 * Estimate costs and revenue for a date range.
 * Monthly revenue: active monthly × list price (assumes all bill in the period).
 * One-time: list price amortized over 90 days, then scaled to range days.
 */
export function estimateAdminFinance(input: {
  rangeDays: number;
  config: AdminCostConfig;
  external: ExternalUsageCounts;
  paying: PayingCustomers;
}): FinanceEstimate {
  const days = Math.max(1, input.rangeDays);
  const monthFraction = days / 30;
  const cfg = input.config;

  const fixedMonthlyEur =
    cfg.serverMonthlyEur +
    cfg.databaseMonthlyEur +
    cfg.upstashMonthlyEur +
    cfg.otherMonthlyEur;

  const fixedProratedEur = fixedMonthlyEur * monthFraction;
  const openMeteoProratedEur = cfg.openMeteoMonthlyEur * monthFraction;

  const mapboxGeocodeEur = per1k(
    input.external.mapboxGeocode,
    cfg.mapboxGeocodePer1kEur,
  );
  const mapboxDirectionsEur = per1k(
    input.external.mapboxDirections,
    cfg.mapboxDirectionsPer1kEur,
  );
  const wikipediaEur = per1k(
    input.external.wikipedia,
    cfg.wikipediaPer1kEur,
  );
  const variableApiEur =
    mapboxGeocodeEur + mapboxDirectionsEur + wikipediaEur;

  const costsTotalEur =
    fixedProratedEur + openMeteoProratedEur + variableApiEur;

  const monthlyGross = input.paying.monthlyActive * cfg.priceMonthlyEur;
  const oneTimeAmortizedPerDay = cfg.priceOneTimeEur / 90;
  const oneTimeGross =
    input.paying.oneTimeActive * oneTimeAmortizedPerDay * days;
  const revenueGrossEur = monthlyGross + oneTimeGross;

  const monthlyFees =
    input.paying.monthlyActive *
    stripeFeeForCharge(cfg.priceMonthlyEur, cfg.stripePercent, cfg.stripeFixedEur);
  // One-time fee already paid at purchase; amortize fee similarly over 90d
  const oneTimeFeePerCharge = stripeFeeForCharge(
    cfg.priceOneTimeEur,
    cfg.stripePercent,
    cfg.stripeFixedEur,
  );
  const oneTimeFees =
    input.paying.oneTimeActive * (oneTimeFeePerCharge / 90) * days;
  const stripeFeesEur = monthlyFees + oneTimeFees;

  const revenueNetEur = revenueGrossEur - stripeFeesEur;
  const netMarginEur = revenueNetEur - costsTotalEur;

  return {
    rangeDays: days,
    fixedMonthlyEur,
    fixedProratedEur,
    openMeteoProratedEur,
    variableApiEur,
    variableBreakdown: {
      mapboxGeocodeEur,
      mapboxDirectionsEur,
      wikipediaEur,
    },
    costsTotalEur,
    revenueGrossEur,
    stripeFeesEur,
    revenueNetEur,
    netMarginEur,
    paying: input.paying,
    prices: {
      monthlyEur: cfg.priceMonthlyEur,
      oneTimeEur: cfg.priceOneTimeEur,
    },
  };
}

export function readAdminCostConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): AdminCostConfig {
  const num = (key: string, fallback: number) => {
    const raw = env[key];
    if (raw === undefined || raw === "") return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };

  return {
    serverMonthlyEur: num("ADMIN_COST_SERVER_EUR", 15),
    databaseMonthlyEur: num("ADMIN_COST_DATABASE_EUR", 10),
    upstashMonthlyEur: num("ADMIN_COST_UPSTASH_EUR", 0),
    otherMonthlyEur: num("ADMIN_COST_OTHER_EUR", 5),
    openMeteoMonthlyEur: num("ADMIN_COST_OPEN_METEO_MONTHLY_EUR", 27),
    mapboxGeocodePer1kEur: num("ADMIN_COST_MAPBOX_GEOCODE_PER_1K_EUR", 0.7),
    mapboxDirectionsPer1kEur: num(
      "ADMIN_COST_MAPBOX_DIRECTIONS_PER_1K_EUR",
      1.85,
    ),
    wikipediaPer1kEur: num("ADMIN_COST_WIKIPEDIA_PER_1K_EUR", 0),
    priceMonthlyEur: num("ADMIN_PRICE_MONTHLY_EUR", 2.8),
    priceOneTimeEur: num("ADMIN_PRICE_ONE_TIME_EUR", 1),
    stripePercent: num("ADMIN_STRIPE_PERCENT", 1.5),
    stripeFixedEur: num("ADMIN_STRIPE_FIXED_EUR", 0.25),
  };
}
