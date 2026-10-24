import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { POST } from "@/app/api/register/route";

/** The sign-up API on a real database. SIGNUP_FREE_CREDITS is 7 in vitest.config.ts. */

afterAll(() => db.$disconnect());

const email = () => `reg-${randomUUID()}@example.test`;

function register(body: unknown, ip: string) {
  return POST(
    new Request("http://localhost/api/register", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/register", () => {
  it("creates the account, grants the free credits and records them in the ledger", async () => {
    const address = email();
    const res = await register({ email: address, password: "correct-horse-1", name: "Asha" }, "10.1.0.1");

    expect(res.status).toBe(201);
    const user = await db.user.findUniqueOrThrow({ where: { email: address } });
    expect(user.credits).toBe(7);
    const ledger = await db.creditLedger.findMany({ where: { userId: user.id } });
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ delta: 7, reason: "signup", balance: 7 });
  });

  it("never stores the password in plain text", async () => {
    const address = email();
    await register({ email: address, password: "correct-horse-2" }, "10.1.0.2");

    const user = await db.user.findUniqueOrThrow({ where: { email: address } });
    expect(user.passwordHash).toMatch(/^scrypt:[0-9a-f]+:[0-9a-f]+$/);
    expect(user.passwordHash).not.toContain("correct-horse-2");
  });

  it("treats the email case-insensitively and refuses a duplicate", async () => {
    const address = email();
    expect((await register({ email: address, password: "correct-horse-3" }, "10.1.0.3")).status).toBe(201);

    const again = await register({ email: address.toUpperCase(), password: "another-pass-9" }, "10.1.0.3");

    expect(again.status).toBe(409);
    expect(await db.user.count({ where: { email: address } })).toBe(1);
  });

  it("rejects a bad email, a short password and a missing body field", async () => {
    expect((await register({ email: "not-an-email", password: "correct-horse-4" }, "10.1.0.4")).status).toBe(400);
    expect((await register({ email: email(), password: "short" }, "10.1.0.4")).status).toBe(400);
    expect((await register({ email: email() }, "10.1.0.4")).status).toBe(400);
  });

  it("limits sign-ups to 5 per hour per address", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      statuses.push((await register({ email: email(), password: "correct-horse-5" }, "10.1.0.99")).status);
    }
    expect(statuses).toEqual([201, 201, 201, 201, 201, 429, 429]);
    // A different address is unaffected.
    expect((await register({ email: email(), password: "correct-horse-5" }, "10.1.0.100")).status).toBe(201);
  });
});
