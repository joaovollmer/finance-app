"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AssetSearchResult } from "@/lib/market/types";

export default function AssetSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AssetSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (query.trim().length < 1) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}`
        );
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data = await res.json().catch(() => null);
        setResults(data?.results ?? []);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  const brAssets = results.filter((r) => r.assetClass === "stock_br");
  const usAssets = results.filter((r) => r.assetClass === "stock_us");

  return (
    <div>
      <div className="relative max-w-[560px]">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-ink-faint">
          ⌕
        </span>
        <input
          autoFocus
          type="text"
          placeholder="Buscar por ticker ou nome… (ex: PETR4, AAPL, ITUB4)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`w-full rounded-xl border-[1.5px] bg-surface px-3 py-3 pl-10 text-sm text-ink outline-none transition ${
            focused
              ? "border-brand shadow-glow"
              : "border-surface-border"
          }`}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Limpar busca"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-base text-ink-faint hover:text-ink"
          >
            ×
          </button>
        )}
      </div>

      {loading && (
        <p className="mt-4 text-sm text-ink-muted">Buscando...</p>
      )}

      {!loading && query.length > 0 && results.length === 0 && (
        <div className="mt-8 text-center text-ink-muted">
          <div className="mb-3 text-3xl">◎</div>
          <div className="text-[15px] font-semibold">
            Nenhum ativo encontrado para “{query}”
          </div>
          <div className="mt-1 text-[13px]">Tente PETR4, VALE3, AAPL…</div>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {brAssets.length > 0 && (
            <ResultGroup
              title="Ações Brasileiras"
              subtitle="B3 · Bovespa"
              items={brAssets}
            />
          )}
          {usAssets.length > 0 && (
            <ResultGroup
              title="Ações Americanas"
              subtitle="NYSE · NASDAQ"
              items={usAssets}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ResultGroup({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: AssetSearchResult[];
}) {
  return (
    <div className="rounded-card border border-surface-border bg-surface p-5">
      <h3
        className="text-base font-bold text-ink"
        style={{ letterSpacing: "-0.01em" }}
      >
        {title}
      </h3>
      <p className="mb-3 mt-0.5 text-[13px] text-ink-muted">{subtitle}</p>
      <ul className="flex flex-col">
        {items.map((r, i) => (
          <li
            key={r.ticker}
            className={i > 0 ? "border-t border-surface-border-light" : ""}
          >
            <Link
              href={`/ativo/${encodeURIComponent(r.displayTicker)}`}
              className="flex items-center justify-between gap-3 rounded-lg px-1 py-3 transition hover:bg-surface-muted"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-pastel text-[10px] font-extrabold text-brand">
                  {r.displayTicker.slice(0, 2)}
                </div>
                <div>
                  <div className="text-[13px] font-bold text-ink">
                    {r.displayTicker}
                  </div>
                  <div className="text-[11px] text-ink-faint">{r.name}</div>
                </div>
              </div>
              <span className="rounded-md bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
                {r.assetClass === "stock_br" ? "B3" : "EUA"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
