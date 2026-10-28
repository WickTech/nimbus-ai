import Stripe from "stripe";

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-09-30.endive",
  });
}

export const stripe: Stripe = /* @__PURE__ */ new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/** Map Stripe Price IDs to the number of credits they grant. */
export const CREDIT_PACKAGES: { priceId: string; credits: number; label: string }[] = [
  {
    priceId: process.env.STRIPE_PRICE_100 ?? "",
    credits: 100,
    label: "100 credits — $1",
  },
  {
    priceId: process.env.STRIPE_PRICE_500 ?? "",
    credits: 500,
    label: "500 credits — $4",
  },
  {
    priceId: process.env.STRIPE_PRICE_2000 ?? "",
    credits: 2000,
    label: "2 000 credits — $14",
  },
];
