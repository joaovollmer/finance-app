import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { computePortfolioValue } from "@/lib/portfolio/total_value";
import type { PortfolioRow } from "@/lib/portfolio/valuation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron envia Authorization: Bearer <CRON_SECRET>. Em outros runtimes
// (chamada manual via curl) também aceitamos query ?secret=... pra debug.
function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(req.url);
  if (url.searchParams.get("secret") === secret) return true;
  return false;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: portfolios, error } = await supabase
    .from("portfolios")
    .select("*");

  if (error) {
    return NextResponse.json(
      { error: "failed_to_load_portfolios", detail: error.message },
      { status: 500 }
    );
  }

  const results: Array<{ portfolio_id: string; total: number | null; error?: string }> =
    [];

  for (const p of (portfolios ?? []) as PortfolioRow[]) {
    try {
      const { totalValue } = await computePortfolioValue(supabase, p);
      const { error: upsertErr } = await supabase
        .from("portfolio_snapshots")
        .upsert(
          {
            portfolio_id: p.id,
            taken_on: today,
            total_value: Number(totalValue.toFixed(2)),
          },
          { onConflict: "portfolio_id,taken_on" }
        );
      if (upsertErr) {
        results.push({ portfolio_id: p.id, total: null, error: upsertErr.message });
      } else {
        results.push({ portfolio_id: p.id, total: totalValue });
      }
    } catch (err) {
      results.push({
        portfolio_id: p.id,
        total: null,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const ok = results.filter((r) => r.error == null).length;
  const failed = results.length - ok;

  return NextResponse.json({
    date: today,
    total_portfolios: results.length,
    succeeded: ok,
    failed,
    results,
  });
}
