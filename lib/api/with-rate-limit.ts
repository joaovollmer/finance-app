import { NextResponse } from "next/server";
import { rateLimit, rateLimitHeaders } from "@/lib/ratelimit";

type Handler = (request: Request) => Promise<Response> | Response;

// Identifica a origem por IP (header x-forwarded-for da Vercel/proxy).
// Em runtime sem proxy cai num fallback estático que ainda protege contra
// loop local mas não é eficaz em prod — confiamos na Vercel.
function clientIdentifier(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim();
  if (ip) return `ip:${ip}`;
  const real = req.headers.get("x-real-ip");
  if (real) return `ip:${real}`;
  return "ip:unknown";
}

export function withRateLimit(handler: Handler): Handler {
  return async (request: Request) => {
    const id = clientIdentifier(request);
    const result = await rateLimit(id);
    const headers = rateLimitHeaders(result);

    if (!result.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded" },
        { status: 429, headers }
      );
    }

    const response = await handler(request);
    Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  };
}
