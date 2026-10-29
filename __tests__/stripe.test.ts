import { afterEach, describe, expect, it, vi } from "vitest";

/** The Stripe client is built lazily, so importing it must not need a key, and using it without one must fail loudly. */
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("lib/stripe", () => {
  it("maps each price id to its credit pack", async () => {
    vi.stubEnv("STRIPE_PRICE_100", "price_100");
    vi.stubEnv("STRIPE_PRICE_500", "price_500");
    vi.stubEnv("STRIPE_PRICE_2000", "price_2000");
    const { CREDIT_PACKAGES } = await import("@/lib/stripe");

    expect(CREDIT_PACKAGES.map((p) => [p.priceId, p.credits])).toEqual([
      ["price_100", 100],
      ["price_500", 500],
      ["price_2000", 2000],
    ]);
  });

  it("throws a clear error when STRIPE_SECRET_KEY is missing", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    const { stripe } = await import("@/lib/stripe");

    expect(() => stripe.webhooks).toThrow("STRIPE_SECRET_KEY is not set");
  });

  it("builds the client on first use when the key is set", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
    const { stripe } = await import("@/lib/stripe");

    expect(typeof stripe.webhooks.constructEvent).toBe("function");
  });
});
