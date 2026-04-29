import { NextResponse } from "next/server";
import { z } from "zod";
import { searchAssets } from "@/lib/market/yahoo";

const QuerySchema = z.object({
  q: z.string().min(1).max(50),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({ q: searchParams.get("q") });
  if (!parsed.success) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchAssets(parsed.data.q);
  return NextResponse.json(
    { results },
    {
      headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" },
    }
  );
}
