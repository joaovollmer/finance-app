import { NextResponse } from "next/server";
import { z } from "zod";
import { getQuote } from "@/lib/market/yahoo";

const QuerySchema = z.object({
  ticker: z.string().min(1).max(20),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({ ticker: searchParams.get("ticker") });
  if (!parsed.success) {
    return NextResponse.json({ error: "ticker inválido" }, { status: 400 });
  }

  try {
    const quote = await getQuote(parsed.data.ticker);
    return NextResponse.json(quote, {
      headers: { "Cache-Control": "s-maxage=15, stale-while-revalidate=30" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "ativo não encontrado" },
      { status: 404 }
    );
  }
}
