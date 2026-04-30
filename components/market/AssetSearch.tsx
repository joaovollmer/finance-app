"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AssetSearchResult } from "@/lib/market/types";

export default function AssetSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AssetSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

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
        const data = await res.json();
        setResults(data.results ?? []);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div>
      <input
        autoFocus
        type="text"
        placeholder="Buscar ativo (ex: PETR4, AAPL, ITUB4, MSFT)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-surface-border px-4 py-3 text-base outline-none focus:border-brand"
      />

      {loading && (
        <p className="mt-3 text-sm text-slate-500">Buscando...</p>
      )}

      {!loading && results.length > 0 && (
        <ul className="mt-4 divide-y divide-surface-border overflow-hidden rounded-lg border border-surface-border bg-white">
          {results.map((r) => (
            <li key={r.ticker}>
              <Link
                href={`/ativo/${encodeURIComponent(r.displayTicker)}`}
                className="flex items-center justify-between px-4 py-3 transition hover:bg-surface-muted"
              >
                <div>
                  <div className="font-medium text-slate-900">
                    {r.displayTicker}
                  </div>
                  <div className="text-xs text-slate-500">{r.name}</div>
                </div>
                <span className="rounded bg-surface-muted px-2 py-0.5 text-xs text-slate-600">
                  {r.assetClass === "stock_br" ? "B3" : "EUA"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!loading && query.length > 0 && results.length === 0 && (
        <p className="mt-3 text-sm text-slate-500">
          Nenhum ativo encontrado. Tente outro código.
        </p>
      )}
    </div>
  );
}
