import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_BUCKETS, clientIp, isRateLimited, rateLimitBucketCount } from "@/lib/rateLimit";

describe("isRateLimited", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("allows up to the limit and blocks the next call", () => {
    const key = "t1";
    const results = Array.from({ length: 5 }, () => isRateLimited(key, 3, 1000));
    expect(results).toEqual([false, false, false, true, true]);
  });

  it("starts a fresh window once the old one has expired", () => {
    const key = "t2";
    for (let i = 0; i < 4; i++) isRateLimited(key, 3, 1000);
    expect(isRateLimited(key, 3, 1000)).toBe(true);

    vi.advanceTimersByTime(1001);

    expect(isRateLimited(key, 3, 1000)).toBe(false);
  });

  it("keeps separate counters per key", () => {
    for (let i = 0; i < 4; i++) isRateLimited("t3-a", 3, 1000);
    expect(isRateLimited("t3-a", 3, 1000)).toBe(true);
    expect(isRateLimited("t3-b", 3, 1000)).toBe(false);
  });
});

describe("rate limiter memory", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("drops expired buckets once the sweep interval has passed", () => {
    for (let i = 0; i < 500; i++) isRateLimited(`prune-${i}`, 3, 1000);
    expect(rateLimitBucketCount()).toBeGreaterThanOrEqual(500);

    vi.advanceTimersByTime(61_000);
    isRateLimited("prune-trigger", 3, 1000);

    // Everything from before has expired; only the triggering key is left.
    expect(rateLimitBucketCount()).toBe(1);
  });

  it("keeps buckets that are still inside their window", () => {
    vi.advanceTimersByTime(61_000);
    isRateLimited("long-window", 1, 10 * 60_000);
    isRateLimited("long-window", 1, 10 * 60_000);

    vi.advanceTimersByTime(61_000);
    isRateLimited("other", 1, 1000);

    expect(isRateLimited("long-window", 1, 10 * 60_000)).toBe(true);
  });

  it("never holds more than MAX_BUCKETS, even with that many live keys in one window", () => {
    vi.advanceTimersByTime(61_000);
    for (let i = 0; i < MAX_BUCKETS + 2_000; i++) isRateLimited(`flood-${i}`, 3, 60 * 60_000);

    expect(rateLimitBucketCount()).toBeLessThanOrEqual(MAX_BUCKETS);
    // The newest key survived the eviction and still counts.
    expect(isRateLimited(`flood-${MAX_BUCKETS + 1_999}`, 1, 60 * 60_000)).toBe(true);
  });
});

describe("clientIp", () => {
  const request = (headers: Record<string, string>) => new Request("http://localhost/", { headers });

  it("uses the first address of x-forwarded-for", () => {
    expect(clientIp(request({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("trims whitespace", () => {
    expect(clientIp(request({ "x-forwarded-for": "  198.51.100.4  " }))).toBe("198.51.100.4");
  });

  it("falls back to 'unknown' when there is no header", () => {
    expect(clientIp(request({}))).toBe("unknown");
  });
});
