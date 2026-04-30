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
import { useEffect, useState } from "react";
import type { Candle, HistoryRange } from "@/lib/market/types";

const RANGES: { value: HistoryRange; label: string }[] = [
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1A" },
  { value: "2y", label: "2A" },
  { value: "5y", label: "5A" },
];

export default function PriceChart({
  ticker,
  initial,
  initialRange = "1y",
  currency = "BRL",
}: {
  ticker: string;
  initial: Candle[];
  initialRange?: HistoryRange;
  currency?: string;
}) {
  const [range, setRange] = useState<HistoryRange>(initialRange);
  const [candles, setCandles] = useState<Candle[]>(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (range === initialRange) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/history?ticker=${encodeURIComponent(ticker)}&range=${range}`
        );
        const data = await res.json();
        if (!cancelled) setCandles(data.candles ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range, ticker, initialRange]);

  const fmt = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });

  return (
    <div>
      <div className="flex items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`rounded-md px-3 py-1 text-sm transition ${
              range === r.value
                ? "bg-brand text-white"
                : "bg-surface-muted text-slate-700 hover:bg-surface-border"
            }`}
          >
            {r.label}
          </button>
        ))}
        {loading && (
          <span className="ml-2 text-xs text-slate-500">carregando...</span>
        )}
      </div>

      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer>
          <AreaChart
            data={candles}
            margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0f766e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              domain={["auto", "auto"]}
            />
            <Tooltip
              formatter={(v: number) => fmt.format(v)}
              labelFormatter={(l) => `Data: ${l}`}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke="#0f766e"
              strokeWidth={2}
              fill="url(#priceFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
