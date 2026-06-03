import { describe, it, expect } from "vitest";
import {
  InsufficientCreditsError,
  TOKENS_PER_CREDIT,
  grantCredits,
  spendCredits,
  tokensToCredits,
} from "@/lib/credits";

/**
 * Minimal in-memory fake of the Prisma surface that credits.ts touches.
 * Keeps the unit tests free of a real database while exercising the
 * transaction + ledger logic exactly as production would run it.
 */
function makeFakeDb(initialCredits: number) {
  const state = { credits: initialCredits, ledger: [] as { delta: number; balance: number; reason: string }[] };

  const tx = {
    user: {
      findUniqueOrThrow: async () => ({ id: "u1", credits: state.credits }),
      update: async ({ data }: { data: { credits: number } }) => {
        state.credits = data.credits;
      },
    },
    creditLedger: {
      create: async ({ data }: { data: { delta: number; balance: number; reason: string } }) => {
        state.ledger.push(data);
      },
    },
  };

  return {
    state,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $transaction: async (fn: (t: any) => Promise<unknown>) => fn(tx),
  };
}

describe("tokensToCredits", () => {
  it("charges a 1-credit minimum", () => {
    expect(tokensToCredits(0)).toBe(1);
    expect(tokensToCredits(1)).toBe(1);
    expect(tokensToCredits(TOKENS_PER_CREDIT)).toBe(1);
  });

  it("rounds partial credits up", () => {
    expect(tokensToCredits(TOKENS_PER_CREDIT + 1)).toBe(2);
    expect(tokensToCredits(TOKENS_PER_CREDIT * 3 - 1)).toBe(3);
  });
});

describe("spendCredits", () => {
  it("deducts and records a ledger entry", async () => {
    const db = makeFakeDb(100);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { balance } = await spendCredits(db as any, "u1", 30, "chat");
    expect(balance).toBe(70);
    expect(db.state.credits).toBe(70);
    expect(db.state.ledger.at(-1)).toMatchObject({ delta: -30, balance: 70, reason: "chat" });
  });

  it("throws InsufficientCreditsError without mutating state", async () => {
    const db = makeFakeDb(10);
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      spendCredits(db as any, "u1", 50, "chat"),
    ).rejects.toBeInstanceOf(InsufficientCreditsError);
    expect(db.state.credits).toBe(10);
    expect(db.state.ledger).toHaveLength(0);
  });
});

describe("grantCredits", () => {
  it("adds credits and records the grant", async () => {
    const db = makeFakeDb(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { balance } = await grantCredits(db as any, "u1", 100, "signup");
    expect(balance).toBe(100);
    expect(db.state.ledger.at(-1)).toMatchObject({ delta: 100, reason: "signup" });
  });
});
