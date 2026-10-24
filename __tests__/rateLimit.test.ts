import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientIp, isRateLimited } from "@/lib/rateLimit";

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
