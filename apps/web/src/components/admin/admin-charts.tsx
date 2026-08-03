"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type AdminChartSeriesPoint = {
  day: string;
  discover: number;
  login: number;
  route: number;
  routeSave: number;
};

export type AdminChartBucket = {
  key: string;
  label: string;
  value: number;
};

const COLORS = {
  discover: "#006591",
  login: "#0d7a4f",
  route: "#b45309",
  routeSave: "#7c3aed",
  bar: "#006591",
  grid: "rgba(70, 69, 85, 0.12)",
  axis: "#464555",
  tooltipBorder: "rgba(70, 69, 85, 0.2)",
};

function shortDay(iso: string): string {
  // YYYY-MM-DD → MM-DD
  return iso.length >= 10 ? iso.slice(5) : iso;
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-4">
      <h3 className="text-sm font-semibold text-on-surface">{title}</h3>
      <div className="mt-3 h-56 w-full min-w-0 sm:h-64">{children}</div>
    </div>
  );
}

function tooltipStyle() {
  return {
    borderRadius: 12,
    border: `1px solid ${COLORS.tooltipBorder}`,
    background: "rgba(255,255,255,0.96)",
    fontSize: 12,
  };
}

export function AdminActivityChart({
  title,
  series,
  labels,
}: {
  title: string;
  series: AdminChartSeriesPoint[];
  labels: {
    discover: string;
    login: string;
    route: string;
    routeSave: string;
  };
}) {
  const data = series.map((p) => ({ ...p, label: shortDay(p.day) }));

  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fill: COLORS.axis, fontSize: 11 }}
            tickMargin={6}
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            width={36}
            tick={{ fill: COLORS.axis, fontSize: 11 }}
          />
          <Tooltip contentStyle={tooltipStyle()} labelFormatter={(_, payload) => {
            const day = payload?.[0]?.payload?.day;
            return typeof day === "string" ? day : "";
          }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="discover"
            name={labels.discover}
            stroke={COLORS.discover}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="login"
            name={labels.login}
            stroke={COLORS.login}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="route"
            name={labels.route}
            stroke={COLORS.route}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="routeSave"
            name={labels.routeSave}
            stroke={COLORS.routeSave}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function AdminBucketChart({
  title,
  buckets,
}: {
  title: string;
  buckets: AdminChartBucket[];
}) {
  const data = buckets.filter((b) => b.value > 0);
  const chartData = data.length > 0 ? data : buckets;

  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 12, left: 8, bottom: 0 }}
        >
          <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: COLORS.axis, fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={88}
            tick={{ fill: COLORS.axis, fontSize: 11 }}
          />
          <Tooltip contentStyle={tooltipStyle()} />
          <Bar dataKey="value" fill={COLORS.bar} radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
