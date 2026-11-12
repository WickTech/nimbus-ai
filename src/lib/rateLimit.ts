/**
 * In-memory sliding-window limiter. Good enough to stop casual credit-farming
 * on a single instance; on multi-instance serverless (Vercel) each instance
 * has its own counter, so a determined attacker can multiply the effective
 * limit by the instance count. Swap for Upstash Redis if that matters.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

// Memory bound: expired buckets are swept at most once a minute, and immediately once the map reaches
// MAX_BUCKETS. If it is still full after the sweep (that many distinct keys inside one window), the oldest
// buckets are dropped down to 90% of the cap (so a flood does not sweep on every call); those keys simply
// start a fresh window.
const SWEEP_INTERVAL_MS = 60_000;
export const MAX_BUCKETS = 10_000;
let lastSweep = 0;

function sweep(now: number): void {
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
  if (buckets.size < MAX_BUCKETS) return;
  // Map iterates in insertion order, so this drops the oldest buckets first.
  const target = Math.floor(MAX_BUCKETS * 0.9);
  for (const key of buckets.keys()) {
    if (buckets.size <= target) break;
    buckets.delete(key);
  }
}

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (now - lastSweep >= SWEEP_INTERVAL_MS || buckets.size >= MAX_BUCKETS) sweep(now);

  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    // delete + set moves a renewed key to the end of the insertion order.
    buckets.delete(key);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}

/** Number of live buckets held in memory (for tests and diagnostics). */
export function rateLimitBucketCount(): number {
  return buckets.size;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "unknown";
}
