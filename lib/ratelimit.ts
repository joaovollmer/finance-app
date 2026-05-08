import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Limite padrão por IP: 60 req/min. Em endpoints mais caros aumentamos a
// janela ou reduzimos o teto via parâmetro.
const DEFAULT_LIMIT = 60;
const DEFAULT_WINDOW_MS = 60_000;

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

const upstashRedis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

const upstashLimiter = upstashRedis
  ? new Ratelimit({
      redis: upstashRedis,
      limiter: Ratelimit.slidingWindow(DEFAULT_LIMIT, "60 s"),
      analytics: true,
      prefix: "investidor:rl",
    })
  : null;

// Fallback in-memory: por instância serverless. Suficiente pra absorver
// pequenos picos quando o Upstash não está configurado (dev local). Em
// produção, sempre apontar Upstash.
const memBuckets = new Map<string, { count: number; resetAt: number }>();

function memLimit(
  id: string,
  max: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = memBuckets.get(id);
  if (!entry || entry.resetAt < now) {
    memBuckets.set(id, { count: 1, resetAt: now + windowMs });
    return { success: true, limit: max, remaining: max - 1, reset: now + windowMs };
  }
  entry.count += 1;
  return {
    success: entry.count <= max,
    limit: max,
    remaining: Math.max(0, max - entry.count),
    reset: entry.resetAt,
  };
}

export async function rateLimit(identifier: string): Promise<RateLimitResult> {
  if (upstashLimiter) {
    const r = await upstashLimiter.limit(identifier);
    return {
      success: r.success,
      limit: r.limit,
      remaining: r.remaining,
      reset: r.reset,
    };
  }
  return memLimit(identifier, DEFAULT_LIMIT, DEFAULT_WINDOW_MS);
}

export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": r.limit.toString(),
    "X-RateLimit-Remaining": r.remaining.toString(),
    "X-RateLimit-Reset": Math.floor(r.reset / 1000).toString(),
  };
}
