import { NextResponse } from "next/server";
import { z } from "zod";
import { getHistory } from "@/lib/market/yahoo";

const QuerySchema = z.object({
  ticker: z.string().min(1).max(20),
  range: z.enum(["1mo", "3mo", "6mo", "1y", "2y", "5y"]).default("1y"),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    ticker: searchParams.get("ticker"),
    range: searchParams.get("range") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "parâmetros inválidos" }, { status: 400 });
  }

  try {
    const candles = await getHistory(parsed.data.ticker, parsed.data.range);
    return NextResponse.json(
      { ticker: parsed.data.ticker, range: parsed.data.range, candles },
      {
        headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
      }
    );
  } catch (e) {
    return NextResponse.json(
      { error: "histórico indisponível" },
      { status: 404 }
    );
  }
}
