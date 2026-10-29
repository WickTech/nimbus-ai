import { beforeEach, describe, expect, it, vi } from "vitest";

/** POST /api/stripe/checkout with auth and Stripe replaced by doubles (no network, no key). */
const create = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/stripe", () => ({
  stripe: { checkout: { sessions: { create } } },
  CREDIT_PACKAGES: [
    { priceId: "price_100", credits: 100, label: "100 credits" },
    { priceId: "price_500", credits: 500, label: "500 credits" },
  ],
}));

import { auth } from "@/lib/auth";
import { POST } from "@/app/api/stripe/checkout/route";

function signedInAs(userId: string | null) {
  vi.mocked(auth).mockResolvedValue((userId ? { user: { id: userId } } : null) as never);
}

function checkout(body: unknown, origin?: string) {
  return POST(
    new Request("http://localhost/api/stripe/checkout", {
      method: "POST",
      headers: { "content-type": "application/json", ...(origin ? { origin } : {}) },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  create.mockReset();
  create.mockResolvedValue({ url: "https://checkout.stripe.test/session" });
});

describe("POST /api/stripe/checkout", () => {
  it("answers 401 without a session and never calls Stripe", async () => {
    signedInAs(null);

    expect((await checkout({ priceId: "price_100" })).status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it("answers 400 for a missing or empty price id", async () => {
    signedInAs("user-1");

    expect((await checkout({})).status).toBe(400);
    expect((await checkout({ priceId: "" })).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("answers 400 for a price id that is not one of the packs", async () => {
    signedInAs("user-1");

    const res = await checkout({ priceId: "price_made_up" });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Unknown price" });
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a payment session that carries the user and the credits to grant", async () => {
    signedInAs("user-1");

    const res = await checkout({ priceId: "price_500" }, "https://app.example.test");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://checkout.stripe.test/session" });
    expect(create).toHaveBeenCalledWith({
      mode: "payment",
      line_items: [{ price: "price_500", quantity: 1 }],
      success_url: "https://app.example.test/chat?topup=success",
      cancel_url: "https://app.example.test/chat",
      metadata: { userId: "user-1", credits: "500" },
    });
  });
});
