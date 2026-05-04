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
        if (!res.ok) {
          if (!cancelled) setCandles([]);
          return;
        }
        const data = await res.json().catch(() => null);
        if (!cancelled) setCandles(data?.candles ?? []);
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

  const first = candles[0]?.close ?? 0;
  const last = candles[candles.length - 1]?.close ?? 0;
  const positive = last >= first;
  const stroke = positive ? "var(--positive)" : "var(--negative)";

  return (
    <div>
      <div className="flex items-center gap-1">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              range === r.value
                ? "bg-brand text-white"
                : "bg-surface-muted text-ink-muted hover:text-ink"
            }`}
          >
            {r.label}
          </button>
        ))}
        {loading && (
          <span className="ml-2 text-xs text-ink-faint">carregando...</span>
        )}
      </div>

      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer>
          <AreaChart
            data={candles}
            margin={{ top: 10, right: 8, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.2} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0.01} />
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
              domain={["auto", "auto"]}
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
              dataKey="close"
              stroke={stroke}
              strokeWidth={2}
              fill="url(#priceFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
