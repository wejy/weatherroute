"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
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
import type { DailyForecastDto, HourlyForecastDto } from "@/lib/types";
import { formatTemp } from "@/lib/utils";
import { formatDateKeyForLocale } from "@/lib/dates";
import {
  TEMP_SCALE_MAX_C,
  TEMP_SCALE_MIN_C,
  temperatureColor,
  temperatureScaleCssGradient,
  temperatureSeriesGradientStops,
} from "@/lib/temp-color";
import { useI18n } from "@/components/i18n/locale-provider";
import { translateCondition } from "@/i18n/translate";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Translator } from "@/i18n/translate";

type ChartDay = DailyForecastDto & { inPeriod: boolean; selected: boolean };

type HourlyPoint = {
  time: string;
  hourLabel: string;
  precipitationProbability: number;
  cloudCover: number;
  precipitationMm?: number;
};

const COLORS = {
  secondary: "#006591",
  secondaryBright: "#39b8fd",
  surfaceVariant: "#e4e1ee",
  onSurface: "#1b1b24",
  onSurfaceVariant: "#464555",
  grid: "rgba(70, 69, 85, 0.12)",
};

function ChartTooltipShell({
  active,
  payload,
  label,
  tripWindowLabel,
  dateLocale,
  children,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDay }>;
  label?: string;
  tripWindowLabel: string;
  dateLocale: "en" | "fi";
  children: (day: ChartDay) => ReactNode;
}) {
  if (!active || !payload?.length) return null;
  const day = payload[0]?.payload;
  if (!day) return null;

  const datePart = day.date
    ? formatDateKeyForLocale(day.date, dateLocale)
    : label;

  return (
    <div className="rounded-xl border border-outline-variant/20 bg-surface/95 px-3.5 py-2.5 shadow-[0px_10px_30px_rgba(0,0,0,0.12)] backdrop-blur-md">
      <p className="mb-1 text-xs font-medium tracking-wide text-on-surface-variant uppercase">
        {day.dayLabel}
        {datePart ? ` ${datePart}` : ""}
        {day.inPeriod ? ` · ${tripWindowLabel}` : ""}
      </p>
      {children(day)}
    </div>
  );
}

function TemperatureTooltip({
  dict,
  tripWindowLabel,
  dateLocale,
  ...props
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDay }>;
  label?: string;
  dict: Dictionary;
  tripWindowLabel: string;
  dateLocale: "en" | "fi";
}) {
  return (
    <ChartTooltipShell
      {...props}
      tripWindowLabel={tripWindowLabel}
      dateLocale={dateLocale}
    >
      {(day) => (
        <p className="text-sm font-semibold text-on-surface">
          <span style={{ color: temperatureColor(day.tempMaxC) }}>
            {formatTemp(day.tempMaxC)}
          </span>
          <span className="text-on-surface-variant">–</span>
          <span style={{ color: temperatureColor(day.tempMinC) }}>
            {formatTemp(day.tempMinC)}
          </span>
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
  dateLocale,
  showMm,
  ...props
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDay }>;
  label?: string;
  t: Translator;
  tripWindowLabel: string;
  dateLocale: "en" | "fi";
  showMm: boolean;
}) {
  return (
    <ChartTooltipShell
      {...props}
      tripWindowLabel={tripWindowLabel}
      dateLocale={dateLocale}
    >
      {(day) => (
        <div className="space-y-0.5 text-sm">
          <p className="font-semibold text-on-surface">
            {t("destination.precip")}:{" "}
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

function TempScaleLegend({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2" title={label}>
      <span className="text-xs font-medium text-on-surface-variant">
        {TEMP_SCALE_MIN_C}°
      </span>
      <div
        className="h-2.5 w-28 rounded-full border border-outline-variant/20 shadow-inner sm:w-36"
        style={{ background: temperatureScaleCssGradient() }}
        aria-hidden="true"
      />
      <span className="text-xs font-medium text-on-surface-variant">
        +{TEMP_SCALE_MAX_C}°
      </span>
    </div>
  );
}

function TempDot({
  cx,
  cy,
  payload,
  dataKey,
}: {
  cx?: number;
  cy?: number;
  payload?: ChartDay;
  dataKey: "tempMaxC" | "tempMinC";
}) {
  if (cx == null || cy == null || !payload) return null;
  const fill = temperatureColor(payload[dataKey]);
  return (
    <circle
      cx={cx}
      cy={cy}
      r={dataKey === "tempMaxC" ? 4.5 : 3.5}
      fill={fill}
      stroke="#fff"
      strokeWidth={2}
    />
  );
}

function hourLabelFromTime(time: string): string {
  const m = time.match(/T(\d{2})/);
  return m ? `${m[1]}:00` : time.slice(11, 16) || time;
}

function hourlyForDate(
  hourly: HourlyForecastDto[] | undefined,
  date: string,
): HourlyPoint[] {
  if (!hourly?.length) return [];
  return hourly
    .filter((h) => h.time.startsWith(date))
    .map((h) => ({
      time: h.time,
      hourLabel: hourLabelFromTime(h.time),
      precipitationProbability: h.precipitationProbability,
      cloudCover: h.cloudCover,
      precipitationMm: h.precipitationMm,
    }));
}

function defaultSelectedDate(
  days: DailyForecastDto[],
  periodStart: string,
  periodEnd: string,
  hourly: HourlyForecastDto[] | undefined,
): string {
  const covered = new Set(
    (hourly ?? []).map((h) => h.time.slice(0, 10)).filter(Boolean),
  );
  const inPeriod = days.filter(
    (d) => d.date >= periodStart && d.date <= periodEnd,
  );
  const pick =
    inPeriod.find((d) => covered.has(d.date)) ??
    days.find((d) => covered.has(d.date)) ??
    inPeriod[0] ??
    days[0];
  return pick?.date ?? "";
}

function HourlyPrecipTooltip({
  t,
  ...props
}: {
  active?: boolean;
  payload?: Array<{ payload: HourlyPoint }>;
  label?: string;
  t: Translator;
}) {
  if (!props.active || !props.payload?.length) return null;
  const hour = props.payload[0]?.payload;
  if (!hour) return null;
  return (
    <div className="rounded-xl border border-outline-variant/20 bg-surface/95 px-3.5 py-2.5 shadow-[0px_10px_30px_rgba(0,0,0,0.12)] backdrop-blur-md">
      <p className="mb-1 text-xs font-medium tracking-wide text-on-surface-variant uppercase">
        {hour.hourLabel}
      </p>
      <div className="space-y-0.5 text-sm">
        <p className="font-semibold text-on-surface">
          {t("destination.rainPct", { pct: hour.precipitationProbability })}
        </p>
        {hour.precipitationMm != null && (
          <p className="font-semibold text-secondary">
            {t("destination.rainMm", { mm: hour.precipitationMm })}
          </p>
        )}
        <p className="text-on-surface-variant">
          {t("destination.cloudsPct", { pct: hour.cloudCover })}
        </p>
      </div>
    </div>
  );
}

export function ForecastCharts({
  days,
  periodStart,
  periodEnd,
  provider,
  hourly,
}: {
  days: DailyForecastDto[];
  periodStart: string;
  periodEnd: string;
  provider: string;
  hourly?: HourlyForecastDto[];
}) {
  const { t, dict, locale } = useI18n();
  const dateLocale = locale === "fi" ? "fi" : "en";
  const gid = useId().replace(/:/g, "");
  const tripWindowLabel = t("destination.tripWindow");

  const [selectedDate, setSelectedDate] = useState(() =>
    defaultSelectedDate(days, periodStart, periodEnd, hourly),
  );

  useEffect(() => {
    setSelectedDate(defaultSelectedDate(days, periodStart, periodEnd, hourly));
  }, [days, periodStart, periodEnd, hourly]);

  const data: ChartDay[] = days.map((day) => ({
    ...day,
    inPeriod: day.date >= periodStart && day.date <= periodEnd,
    selected: day.date === selectedDate,
  }));

  const hourlyPoints = useMemo(
    () => hourlyForDate(hourly, selectedDate),
    [hourly, selectedDate],
  );
  const selectedDay = days.find((d) => d.date === selectedDate);
  const hasHourly = (hourly?.length ?? 0) > 0;

  const hasPrecipMm = data.some(
    (d) => d.precipitationMm != null && !Number.isNaN(d.precipitationMm),
  );
  const maxMm = hasPrecipMm
    ? Math.max(2, ...data.map((d) => d.precipitationMm ?? 0))
    : 0;
  const mmDomainMax = Math.ceil(maxMm * 1.15 * 2) / 2;

  const temps = data.flatMap((d) => [d.tempMinC, d.tempMaxC]);
  const tempMin = Math.floor(Math.min(...temps) - 2);
  const tempMax = Math.ceil(Math.max(...temps) + 2);

  const maxStops = temperatureSeriesGradientStops(data.map((d) => d.tempMaxC));
  const minStops = temperatureSeriesGradientStops(data.map((d) => d.tempMinC));
  const maxStrokeId = `tempMaxStroke-${gid}`;
  const maxFillId = `tempMaxFill-${gid}`;
  const minStrokeId = `tempMinStroke-${gid}`;
  const hourlyFillId = `hourlyPrecipFill-${gid}`;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-on-surface">
            {t("destination.chartsTemp")}
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: temperatureColor(28) }}
              />
              {t("destination.high")}
            </span>
            <span className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: temperatureColor(8) }}
              />
              {t("destination.low")}
            </span>
            <TempScaleLegend label={t("destination.tempScale")} />
          </div>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 12, right: 8, left: -12, bottom: 0 }}
            >
              <defs>
                <linearGradient id={maxStrokeId} x1="0" y1="0" x2="1" y2="0">
                  {maxStops.map((s) => (
                    <stop
                      key={`max-s-${s.offset}`}
                      offset={s.offset}
                      stopColor={s.color}
                    />
                  ))}
                </linearGradient>
                <linearGradient id={maxFillId} x1="0" y1="0" x2="1" y2="0">
                  {maxStops.map((s) => (
                    <stop
                      key={`max-f-${s.offset}`}
                      offset={s.offset}
                      stopColor={s.color}
                      stopOpacity={0.28}
                    />
                  ))}
                </linearGradient>
                <linearGradient id={minStrokeId} x1="0" y1="0" x2="1" y2="0">
                  {minStops.map((s) => (
                    <stop
                      key={`min-s-${s.offset}`}
                      offset={s.offset}
                      stopColor={s.color}
                    />
                  ))}
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke={COLORS.grid}
                vertical={false}
                strokeDasharray="4 8"
              />
              <XAxis
                dataKey="dayLabel"
                tick={{
                  fill: COLORS.onSurfaceVariant,
                  fontSize: 12,
                  fontWeight: 600,
                }}
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
                    dateLocale={dateLocale}
                  />
                }
                cursor={{
                  stroke: COLORS.onSurfaceVariant,
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                  strokeOpacity: 0.35,
                }}
              />
              <Area
                type="monotone"
                dataKey="tempMaxC"
                name="High"
                stroke={`url(#${maxStrokeId})`}
                strokeWidth={2.5}
                fill={`url(#${maxFillId})`}
                animationDuration={900}
                animationEasing="ease-out"
                dot={<TempDot dataKey="tempMaxC" />}
                activeDot={{
                  r: 6,
                  strokeWidth: 2,
                  stroke: "#fff",
                }}
              />
              <Line
                type="monotone"
                dataKey="tempMinC"
                name="Low"
                stroke={`url(#${minStrokeId})`}
                strokeWidth={2}
                dot={<TempDot dataKey="tempMinC" />}
                animationDuration={1100}
                animationEasing="ease-out"
                activeDot={{
                  r: 5,
                  strokeWidth: 2,
                  stroke: "#fff",
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
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
        {hasHourly ? (
          <p className="mb-4 text-sm text-on-surface-variant">
            {t("destination.precipHint")}
          </p>
        ) : null}

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
              onClick={(state) => {
                const date = (
                  state as { activePayload?: Array<{ payload?: ChartDay }> }
                )?.activePayload?.[0]?.payload?.date;
                if (typeof date === "string") setSelectedDate(date);
              }}
              style={{ cursor: hasHourly ? "pointer" : undefined }}
            >
              <defs>
                <linearGradient id={`precipFill-${gid}`} x1="0" y1="0" x2="0" y2="1">
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
                tick={{
                  fill: COLORS.onSurfaceVariant,
                  fontSize: 12,
                  fontWeight: 600,
                }}
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
                    dateLocale={dateLocale}
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
                    fillOpacity={day.selected ? 1 : day.inPeriod ? 0.95 : 0.35}
                    stroke={day.selected ? COLORS.secondary : "transparent"}
                    strokeWidth={day.selected ? 2 : 0}
                  />
                ))}
              </Bar>
              <Bar
                yAxisId="pct"
                dataKey="precipitationProbability"
                name="Precip"
                fill={`url(#precipFill-${gid})`}
                radius={[6, 6, 2, 2]}
                maxBarSize={28}
                animationDuration={1000}
                animationEasing="ease-out"
              >
                {data.map((day) => (
                  <Cell
                    key={`precip-${day.date}`}
                    fill={
                      day.inPeriod || day.selected
                        ? `url(#precipFill-${gid})`
                        : COLORS.secondaryBright
                    }
                    fillOpacity={day.selected ? 1 : day.inPeriod ? 1 : 0.3}
                    stroke={day.selected ? COLORS.onSurface : "transparent"}
                    strokeWidth={day.selected ? 2 : 0}
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

        {hasHourly ? (
          <div className="mt-6 border-t border-outline-variant/20 pt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-on-surface">
                {t("destination.hourlyForDay", {
                  day: selectedDay
                    ? `${selectedDay.dayLabel} ${formatDateKeyForLocale(selectedDay.date, dateLocale)}`
                    : formatDateKeyForLocale(selectedDate, dateLocale),
                })}
              </h3>
              <span className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
                <span className="h-0.5 w-4 rounded-full bg-secondary" />
                {t("destination.precipHourly")}
              </span>
            </div>
            {hourlyPoints.length > 0 ? (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={hourlyPoints}
                    margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id={hourlyFillId}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={COLORS.secondaryBright}
                          stopOpacity={0.45}
                        />
                        <stop
                          offset="100%"
                          stopColor={COLORS.secondary}
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke={COLORS.grid}
                      vertical={false}
                      strokeDasharray="4 8"
                    />
                    <XAxis
                      dataKey="hourLabel"
                      interval="preserveStartEnd"
                      minTickGap={28}
                      tick={{
                        fill: COLORS.onSurfaceVariant,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                      axisLine={false}
                      tickLine={false}
                      dy={6}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: COLORS.onSurfaceVariant, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${v}%`}
                      width={40}
                    />
                    <Tooltip content={<HourlyPrecipTooltip t={t} />} />
                    <Area
                      type="monotone"
                      dataKey="precipitationProbability"
                      stroke={COLORS.secondary}
                      strokeWidth={2.5}
                      fill={`url(#${hourlyFillId})`}
                      animationDuration={700}
                      animationEasing="ease-out"
                      activeDot={{
                        r: 5,
                        strokeWidth: 2,
                        stroke: "#fff",
                        fill: COLORS.secondary,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant">
                {t("destination.hourlyEmpty")}
              </p>
            )}
          </div>
        ) : null}

        <p className="mt-3 text-xs text-on-surface-variant">
          {t("destination.source", {
            provider,
            start: formatDateKeyForLocale(periodStart, dateLocale),
            end: formatDateKeyForLocale(periodEnd, dateLocale),
          })}
        </p>
      </section>
    </div>
  );
}
