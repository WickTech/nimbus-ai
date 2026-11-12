import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

/**
 * Sign-up atomicity on a real database: when the signup grant fails, the account must not be left behind
 * (an orphan without credits that would also block a retry with the same email).
 */
const failGrant = vi.hoisted(() => ({ on: false }));

vi.mock("@/lib/credits", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/credits")>();
  return {
    ...real,
    grantCreditsInTx: (...args: Parameters<typeof real.grantCreditsInTx>) => {
      if (failGrant.on) throw new Error("ledger write failed");
      return real.grantCreditsInTx(...args);
    },
  };
});

import { db } from "@/lib/db";
import { POST } from "@/app/api/register/route";

afterAll(() => db.$disconnect());
afterEach(() => {
  failGrant.on = false;
  vi.unstubAllEnvs();
});

function register(address: string, ip: string) {
  return POST(
    new Request("http://localhost/api/register", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ email: address, password: "correct-horse-8" }),
    }),
  );
}

describe("POST /api/register atomicity", () => {
  it("rolls the new account back when the signup grant fails, so a retry succeeds", async () => {
    const address = `rollback-${randomUUID()}@example.test`;
    failGrant.on = true;

    await expect(register(address, "10.2.0.1")).rejects.toThrow("ledger write failed");
    expect(await db.user.count({ where: { email: address } })).toBe(0);

    failGrant.on = false;
    const retry = await register(address, "10.2.0.1");

    expect(retry.status).toBe(201);
    expect((await db.user.findUniqueOrThrow({ where: { email: address } })).credits).toBe(7);
  });

  it("creates the account without a ledger row when the free-credit setting is zero", async () => {
    vi.stubEnv("SIGNUP_FREE_CREDITS", "0");
    const address = `zero-${randomUUID()}@example.test`;

    const res = await register(address, "10.2.0.2");

    expect(res.status).toBe(201);
    const user = await db.user.findUniqueOrThrow({ where: { email: address } });
    expect(user.credits).toBe(0);
    expect(await db.creditLedger.count({ where: { userId: user.id } })).toBe(0);
  });
});
