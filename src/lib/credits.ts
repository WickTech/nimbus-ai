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
    // Conditional UPDATE (not read-then-write) so the balance check and the
    // deduction are one atomic statement — concurrent spenders serialize on
    // the row instead of racing on a stale read.
    const { count } = await tx.user.updateMany({
      where: { id: userId, credits: { gte: cost } },
      data: { credits: { decrement: cost } },
    });

    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (count === 0) throw new InsufficientCreditsError(user.credits);

    await tx.creditLedger.create({
      data: { userId, delta: -cost, reason, balance: user.credits },
    });
    return { balance: user.credits };
  });
}

/**
 * Grant credits (signup bonus, top-up, refund) and record it.
 *
 * `externalRef` makes the grant idempotent: it is stored on the ledger row under a unique constraint, so a second
 * grant with the same ref fails (Prisma P2002) and the whole transaction, balance update included, rolls back.
 */
export async function grantCredits(
  db: PrismaClient,
  userId: string,
  amount: number,
  reason: string,
  externalRef?: string,
): Promise<{ balance: number }> {
  if (amount <= 0) throw new Error("amount must be positive");

  return db.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const balance = user.credits + amount;
    await tx.user.update({ where: { id: userId }, data: { credits: balance } });
    await tx.creditLedger.create({
      data: { userId, delta: amount, reason, balance, externalRef },
    });
    return { balance };
  });
}
