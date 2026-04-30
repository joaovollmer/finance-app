"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
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
}: {
  data: SeriesPoint[];
  currency?: string;
}) {
  const fmt = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "#475569" }}
            minTickGap={32}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#475569" }}
            tickFormatter={(v) => fmt.format(v)}
            width={90}
          />
          <Tooltip
            formatter={(v: number) => fmt.format(v)}
            labelFormatter={(l) => `Data: ${l}`}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#0f766e"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
