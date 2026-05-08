import { NextResponse } from "next/server";
import { z } from "zod";
import { getAssetNews } from "@/lib/market/news";
import { withRateLimit } from "@/lib/api/with-rate-limit";

const QuerySchema = z.object({
  ticker: z.string().min(1).max(20),
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

export const GET = withRateLimit(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    ticker: searchParams.get("ticker"),
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "ticker inválido" }, { status: 400 });
  }

  try {
    const items = await getAssetNews(parsed.data.ticker, parsed.data.limit);
    return NextResponse.json(
      { items },
      {
        headers: { "Cache-Control": "s-maxage=900, stale-while-revalidate=1800" },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "falha ao carregar notícias" },
      { status: 502 }
    );
  }
});
