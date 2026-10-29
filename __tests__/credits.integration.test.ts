import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { InsufficientCreditsError, grantCredits, spendCredits } from "@/lib/credits";

/**
 * The credit ledger's promises, tested on a real database with real transactions
 * (the unit tests in credits.test.ts use an in-memory fake).
 */

afterAll(() => db.$disconnect());

async function newUser(credits = 0): Promise<string> {
  const user = await db.user.create({ data: { email: `u-${randomUUID()}@example.test` } });
  if (credits > 0) await grantCredits(db, user.id, credits, "seed");
  return user.id;
}

async function balanceOf(userId: string): Promise<number> {
  return (await db.user.findUniqueOrThrow({ where: { id: userId } })).credits;
}

async function ledgerSum(userId: string): Promise<number> {
  const total = await db.creditLedger.aggregate({ where: { userId }, _sum: { delta: true } });
  return total._sum.delta ?? 0;
}

describe("credit ledger on a real database", () => {
  it("parallel spends can never overdraw the balance", async () => {
    const userId = await newUser(12);

    const results = await Promise.allSettled(
      Array.from({ length: 40 }, () => spendCredits(db, userId, 1, "test:spend")),
    );

    const ok = results.filter((r) => r.status === "fulfilled");
    const refused = results.filter((r) => r.status === "rejected");
    expect(ok).toHaveLength(12);
    expect(refused).toHaveLength(28);
    for (const r of refused) {
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(InsufficientCreditsError);
    }
    expect(await balanceOf(userId)).toBe(0);
  });

  it("every successful spend leaves exactly one ledger row and the balances run 11..0 once each", async () => {
    const userId = await newUser(12);
    await Promise.allSettled(Array.from({ length: 30 }, () => spendCredits(db, userId, 1, "test:spend")));

    const spends = await db.creditLedger.findMany({ where: { userId, reason: "test:spend" } });
    expect(spends).toHaveLength(12);
    expect(spends.map((s) => s.balance).sort((a, b) => b - a)).toEqual([11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
    expect(spends.every((s) => s.delta === -1)).toBe(true);
  });

  it("the ledger always adds up to the balance, even with grants and spends racing", async () => {
    const userId = await newUser(20);

    // Deterministic pseudo-random mix of 60 operations, all started at once.
    let seed = 12345;
    const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const operations = Array.from({ length: 60 }, () => {
      const amount = 1 + Math.floor(next() * 5);
      return next() < 0.4
        ? grantCredits(db, userId, amount, "test:grant")
        : spendCredits(db, userId, amount, "test:spend");
    });
    await Promise.allSettled(operations);

    const balance = await balanceOf(userId);
    expect(balance).toBeGreaterThanOrEqual(0);
    expect(await ledgerSum(userId)).toBe(balance);
  });

  it("a refused spend changes nothing and writes no ledger row", async () => {
    const userId = await newUser(3);
    const before = await db.creditLedger.count({ where: { userId } });

    await expect(spendCredits(db, userId, 4, "test:too-much")).rejects.toMatchObject({
      name: "InsufficientCreditsError",
      balance: 3,
    });

    expect(await balanceOf(userId)).toBe(3);
    expect(await db.creditLedger.count({ where: { userId } })).toBe(before);
  });

  it("a grant repeated with the same externalRef is refused and leaves balance and ledger untouched", async () => {
    const userId = await newUser(5);
    await grantCredits(db, userId, 100, "topup", "cs_once");

    await expect(grantCredits(db, userId, 100, "topup", "cs_once")).rejects.toMatchObject({ code: "P2002" });

    expect(await balanceOf(userId)).toBe(105);
    expect(await ledgerSum(userId)).toBe(105);
  });

  it("rejects negative spends and non-positive grants", async () => {
    const userId = await newUser(5);
    await expect(spendCredits(db, userId, -1, "test")).rejects.toThrow("non-negative");
    await expect(grantCredits(db, userId, 0, "test")).rejects.toThrow("positive");
    expect(await balanceOf(userId)).toBe(5);
  });
});
