import type { PrismaClient } from "@prisma/client";

/**
 * Usage-based credit billing.
 *
 * Pricing model: 1 credit per 1,000 tokens (rounded up), minimum 1 credit
 * per request. The full token cost is only known after the model responds,
 * so callers reserve an estimate up front and reconcile afterwards.
 */
export const TOKENS_PER_CREDIT = 1000;

export class InsufficientCreditsError extends Error {
  constructor(public readonly balance: number) {
    super(`Insufficient credits (balance: ${balance})`);
    this.name = "InsufficientCreditsError";
  }
}

/** Convert a token count into the number of credits it costs. */
export function tokensToCredits(tokens: number): number {
  return Math.max(1, Math.ceil(tokens / TOKENS_PER_CREDIT));
}

/**
 * Atomically deduct credits and append a ledger entry. Throws
 * InsufficientCreditsError if the user cannot cover the cost.
 *
 * Runs inside a transaction so the balance and ledger never diverge.
 */
export async function spendCredits(
  db: PrismaClient,
  userId: string,
  cost: number,
  reason: string,
): Promise<{ balance: number }> {
  if (cost < 0) throw new Error("cost must be non-negative");

  return db.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.credits < cost) throw new InsufficientCreditsError(user.credits);

    const balance = user.credits - cost;
    await tx.user.update({ where: { id: userId }, data: { credits: balance } });
    await tx.creditLedger.create({
      data: { userId, delta: -cost, reason, balance },
    });
    return { balance };
  });
}

/** Grant credits (signup bonus, top-up, refund) and record it. */
export async function grantCredits(
  db: PrismaClient,
  userId: string,
  amount: number,
  reason: string,
): Promise<{ balance: number }> {
  if (amount <= 0) throw new Error("amount must be positive");

  return db.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const balance = user.credits + amount;
    await tx.user.update({ where: { id: userId }, data: { credits: balance } });
    await tx.creditLedger.create({
      data: { userId, delta: amount, reason, balance },
    });
    return { balance };
  });
}
