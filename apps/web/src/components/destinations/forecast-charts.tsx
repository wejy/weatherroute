"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyForecastDto } from "@/lib/types";
import { formatTemp } from "@/lib/utils";
import { useI18n } from "@/components/i18n/locale-provider";
import { translateCondition } from "@/i18n/translate";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Translator } from "@/i18n/translate";

type ChartDay = DailyForecastDto & { inPeriod: boolean };

const COLORS = {
  primary: "#4f46e5",
  primarySoft: "#c3c0ff",
  secondary: "#006591",
  secondaryBright: "#39b8fd",
  surfaceVariant: "#e4e1ee",
  onSurface: "#1b1b24",
  onSurfaceVariant: "#464555",
  grid: "rgba(70, 69, 85, 0.12)",
  tooltipBg: "rgba(252, 248, 255, 0.96)",
};

function ChartTooltipShell({
  active,
  payload,
  label,
  tripWindowLabel,
  children,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDay }>;
  label?: string;
  tripWindowLabel: string;
  children: (day: ChartDay) => ReactNode;
}) {
  if (!active || !payload?.length) return null;
  const day = payload[0]?.payload;
  if (!day) return null;

  return (
    <div className="rounded-xl border border-outline-variant/20 bg-surface/95 px-3.5 py-2.5 shadow-[0px_10px_30px_rgba(0,0,0,0.12)] backdrop-blur-md">
      <p className="mb-1 text-xs font-medium tracking-wide text-on-surface-variant uppercase">
        {label}
        {day.inPeriod ? ` · ${tripWindowLabel}` : ""}
      </p>
      {children(day)}
    </div>
  );
}

function TemperatureTooltip({
  dict,
  tripWindowLabel,
  ...props
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDay }>;
  label?: string;
  dict: Dictionary;
  tripWindowLabel: string;
}) {
  return (
    <ChartTooltipShell {...props} tripWindowLabel={tripWindowLabel}>
      {(day) => (
        <p className="text-sm font-semibold text-on-surface">
          {formatTemp(day.tempMinC)}–{formatTemp(day.tempMaxC)}C
          <span className="ml-1.5 font-normal text-on-surface-variant">
            {translateCondition(dict, day.condition)}
          </span>
        </p>
      )}
    </ChartTooltipShell>
  );
}

function PrecipTooltip({
  t,
  tripWindowLabel,
  showMm,
  ...props
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDay }>;
  label?: string;
  t: Translator;
  tripWindowLabel: string;
  showMm: boolean;
}) {
  return (
    <ChartTooltipShell {...props} tripWindowLabel={tripWindowLabel}>
      {(day) => (
        <div className="space-y-0.5 text-sm">
          <p className="font-semibold text-on-surface">
            {t("destination.rainPct", { pct: day.precipitationProbability })}
          </p>
          {showMm && day.precipitationMm != null && (
            <p className="font-semibold text-secondary">
              {t("destination.rainMm", { mm: day.precipitationMm })}
            </p>
          )}
          <p className="text-on-surface-variant">
            {t("destination.cloudsPct", { pct: day.cloudCover })}
          </p>
        </div>
      )}
    </ChartTooltipShell>
  );
}

export function ForecastCharts({
  days,
  periodStart,
  periodEnd,
  provider,
}: {
  days: DailyForecastDto[];
  periodStart: string;
  periodEnd: string;
  provider: string;
}) {
  const { t, dict } = useI18n();
  const tripWindowLabel = t("destination.tripWindow");
  const data: ChartDay[] = days.map((day) => ({
    ...day,
    inPeriod: day.date >= periodStart && day.date <= periodEnd,
  }));

  const hasPrecipMm = data.some(
    (d) => d.precipitationMm != null && !Number.isNaN(d.precipitationMm),
  );
  const maxMm = hasPrecipMm
    ? Math.max(
        2,
        ...data.map((d) => d.precipitationMm ?? 0),
      )
    : 0;
  const mmDomainMax = Math.ceil(maxMm * 1.15 * 2) / 2;

  const temps = data.flatMap((d) => [d.tempMinC, d.tempMaxC]);
  const tempMin = Math.floor(Math.min(...temps) - 2);
  const tempMax = Math.ceil(Math.max(...temps) + 2);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-on-surface">
            {t("destination.chartsTemp")}
          </h2>
          <div className="flex gap-4">
            <span className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
              <span className="h-2.5 w-2.5 rounded-full bg-primary-container" />
              {t("destination.high")}
            </span>
            <span className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
              <span className="h-2.5 w-2.5 rounded-full bg-primary-fixed-dim" />
              {t("destination.low")}
            </span>
          </div>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 12, right: 8, left: -12, bottom: 0 }}
            >
              <defs>
                <linearGradient id="tempMaxFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={COLORS.primary}
                    stopOpacity={0.28}
                  />
                  <stop
                    offset="100%"
                    stopColor={COLORS.primary}
                    stopOpacity={0.02}
                  />
                </linearGradient>
                <linearGradient id="tempMinFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={COLORS.primarySoft}
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="100%"
                    stopColor={COLORS.primarySoft}
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke={COLORS.grid}
                vertical={false}
                strokeDasharray="4 8"
              />
              <XAxis
                dataKey="dayLabel"
                tick={{ fill: COLORS.onSurfaceVariant, fontSize: 12, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                dy={8}
              />
              <YAxis
                domain={[tempMin, tempMax]}
                tick={{ fill: COLORS.onSurfaceVariant, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}°`}
                width={40}
              />
              <Tooltip
                content={
                  <TemperatureTooltip
                    dict={dict}
                    tripWindowLabel={tripWindowLabel}
                  />
                }
                cursor={{
                  stroke: COLORS.primarySoft,
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
              />
              <Area
                type="monotone"
                dataKey="tempMaxC"
                name="High"
                stroke={COLORS.primary}
                strokeWidth={2.5}
                fill="url(#tempMaxFill)"
                animationDuration={900}
                animationEasing="ease-out"
                activeDot={{
                  r: 5,
                  strokeWidth: 2,
                  stroke: "#fff",
                  fill: COLORS.primary,
                }}
              />
              <Line
                type="monotone"
                dataKey="tempMinC"
                name="Low"
                stroke={COLORS.primarySoft}
                strokeWidth={2}
                dot={false}
                animationDuration={1100}
                animationEasing="ease-out"
                activeDot={{
                  r: 4,
                  strokeWidth: 2,
                  stroke: "#fff",
                  fill: COLORS.primarySoft,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-on-surface">
            {t("destination.chartsPrecip")}
          </h2>
          <div className="flex flex-wrap gap-4">
            <span className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
              <span className="h-3 w-3 rounded-sm bg-secondary-container" />
              {t("destination.precip")}
            </span>
            <span className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
              <span className="h-3 w-3 rounded-sm bg-surface-variant" />
              {t("destination.clouds")}
            </span>
            {hasPrecipMm && (
              <span className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
                <span className="h-0.5 w-4 rounded-full bg-secondary" />
                {t("destination.precipMm")}
              </span>
            )}
          </div>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{
                top: 12,
                right: hasPrecipMm ? 8 : 8,
                left: -12,
                bottom: 0,
              }}
              barGap={4}
              barCategoryGap="22%"
            >
              <defs>
                <linearGradient id="precipFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={COLORS.secondaryBright}
                    stopOpacity={1}
                  />
                  <stop
                    offset="100%"
                    stopColor={COLORS.secondary}
                    stopOpacity={0.85}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke={COLORS.grid}
                vertical={false}
                strokeDasharray="4 8"
              />
              <XAxis
                dataKey="dayLabel"
                tick={{ fill: COLORS.onSurfaceVariant, fontSize: 12, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                dy={8}
              />
              <YAxis
                yAxisId="pct"
                domain={[0, 100]}
                tick={{ fill: COLORS.onSurfaceVariant, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}%`}
                width={40}
              />
              {hasPrecipMm && (
                <YAxis
                  yAxisId="mm"
                  orientation="right"
                  domain={[0, mmDomainMax]}
                  tick={{ fill: COLORS.secondary, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v}mm`}
                  width={44}
                />
              )}
              <Tooltip
                content={
                  <PrecipTooltip
                    t={t}
                    tripWindowLabel={tripWindowLabel}
                    showMm={hasPrecipMm}
                  />
                }
                cursor={{ fill: "rgba(57, 184, 253, 0.08)" }}
              />
              <Bar
                yAxisId="pct"
                dataKey="cloudCover"
                name="Clouds"
                fill={COLORS.surfaceVariant}
                radius={[6, 6, 2, 2]}
                maxBarSize={28}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {data.map((day) => (
                  <Cell
                    key={`cloud-${day.date}`}
                    fill={COLORS.surfaceVariant}
                    fillOpacity={day.inPeriod ? 0.95 : 0.35}
                  />
                ))}
              </Bar>
              <Bar
                yAxisId="pct"
                dataKey="precipitationProbability"
                name="Precip"
                fill="url(#precipFill)"
                radius={[6, 6, 2, 2]}
                maxBarSize={28}
                animationDuration={1000}
                animationEasing="ease-out"
              >
                {data.map((day) => (
                  <Cell
                    key={`precip-${day.date}`}
                    fill={
                      day.inPeriod
                        ? "url(#precipFill)"
                        : COLORS.secondaryBright
                    }
                    fillOpacity={day.inPeriod ? 1 : 0.3}
                  />
                ))}
              </Bar>
              {hasPrecipMm && (
                <Line
                  yAxisId="mm"
                  type="monotone"
                  dataKey="precipitationMm"
                  name="mm"
                  stroke={COLORS.secondary}
                  strokeWidth={2.5}
                  dot={{
                    r: 3,
                    fill: COLORS.secondary,
                    strokeWidth: 0,
                  }}
                  activeDot={{
                    r: 5,
                    strokeWidth: 2,
                    stroke: "#fff",
                    fill: COLORS.secondary,
                  }}
                  animationDuration={1100}
                  animationEasing="ease-out"
                  connectNulls
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <p className="mt-3 text-xs text-on-surface-variant">
          {t("destination.source", {
            provider,
            start: periodStart,
            end: periodEnd,
          })}
        </p>
      </section>
    </div>
  );
}
