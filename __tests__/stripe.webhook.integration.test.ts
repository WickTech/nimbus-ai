import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * POST /api/stripe/webhook on a real database. Events are signed with Stripe's own test-header helper, so the
 * real signature check runs; only the request headers are supplied by hand.
 */
const SECRET = "whsec_test_secret";
const requestHeaders = vi.hoisted(() => ({ signature: null as string | null }));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(requestHeaders.signature ? { "stripe-signature": requestHeaders.signature } : {}),
}));

import Stripe from "stripe";
import { db } from "@/lib/db";
import { grantCredits } from "@/lib/credits";
import { POST } from "@/app/api/stripe/webhook/route";

afterAll(() => db.$disconnect());

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  requestHeaders.signature = null;
});

async function newUser(credits = 0): Promise<string> {
  const user = await db.user.create({ data: { email: `stripe-${randomUUID()}@example.test` } });
  if (credits > 0) await grantCredits(db, user.id, credits, "seed");
  return user.id;
}

const credits = async (userId: string) => (await db.user.findUniqueOrThrow({ where: { id: userId } })).credits;

function send(event: unknown, { sign = true, secret = SECRET } = {}) {
  const payload = JSON.stringify(event);
  if (sign) requestHeaders.signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  return POST(new Request("http://localhost/api/stripe/webhook", { method: "POST", body: payload }));
}

const completed = (metadata: Record<string, string> | null) => ({
  id: `evt_${randomUUID()}`,
  object: "event",
  type: "checkout.session.completed",
  data: { object: { id: "cs_test", object: "checkout.session", metadata } },
});

describe("POST /api/stripe/webhook", () => {
  it("answers 400 when the signature header is missing", async () => {
    const res = await send(completed({}), { sign: false });

    expect(res.status).toBe(400);
  });

  it("answers 400 when the webhook secret is not configured", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    expect((await send(completed({}))).status).toBe(400);
  });

  it("rejects an event signed with the wrong secret and grants nothing", async () => {
    const userId = await newUser();

    const res = await send(completed({ userId, credits: "100" }), { secret: "whsec_someone_else" });

    expect(res.status).toBe(400);
    expect(await credits(userId)).toBe(0);
  });

  it("grants the purchased credits and writes one topup ledger row", async () => {
    const userId = await newUser(5);

    const res = await send(completed({ userId, credits: "500" }));

    expect(res.status).toBe(200);
    expect(await credits(userId)).toBe(505);
    const rows = await db.creditLedger.findMany({ where: { userId, reason: "topup" } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ delta: 500, balance: 505 });
  });

  it.each([
    ["no metadata", null],
    ["no user id", { credits: "100" }],
    ["zero credits", { userId: "x", credits: "0" }],
    ["credits that are not a number", { userId: "x", credits: "lots" }],
  ])("acknowledges a completed session with %s without granting anything", async (_name, metadata) => {
    const before = await db.creditLedger.count();

    const res = await send(completed(metadata));

    expect(res.status).toBe(200);
    expect(await db.creditLedger.count()).toBe(before);
  });

  it("acknowledges event types it does not handle", async () => {
    const userId = await newUser();

    const res = await send({ ...completed({ userId, credits: "100" }), type: "charge.refunded" });

    expect(res.status).toBe(200);
    expect(await credits(userId)).toBe(0);
  });
});
