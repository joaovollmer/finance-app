"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface SeriesPoint {
  date: string;
  value: number;
}

export default function PortfolioChart({
  data,
  currency = "BRL",
  height = 220,
}: {
  data: SeriesPoint[];
  currency?: string;
  height?: number;
}) {
  const fmt = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="brandFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--text-faint)" }}
            minTickGap={32}
            stroke="var(--border)"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--text-faint)" }}
            tickFormatter={(v) => fmt.format(v)}
            width={84}
            stroke="var(--border)"
          />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: "1px solid var(--border)",
              fontSize: 12,
            }}
            formatter={(v: number) => fmt.format(v)}
            labelFormatter={(l) => `Data: ${l}`}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--brand)"
            strokeWidth={2}
            fill="url(#brandFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
