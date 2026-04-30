import { NextResponse } from "next/server";
import { getUsdToBrl } from "@/lib/market/bcb";

export async function GET() {
  try {
    const fx = await getUsdToBrl();
    return NextResponse.json(fx, {
      headers: { "Cache-Control": "s-maxage=900, stale-while-revalidate=1800" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "câmbio indisponível" },
      { status: 502 }
    );
  }
}
