/**
 * In-memory sliding-window limiter. Good enough to stop casual credit-farming
 * on a single instance; on multi-instance serverless (Vercel) each instance
 * has its own counter, so a determined attacker can multiply the effective
 * limit by the instance count. Swap for Upstash Redis if that matters.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "unknown";
}
