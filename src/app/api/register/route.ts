import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { grantCreditsInTx } from "@/lib/credits";
import { clientIp, isRateLimited } from "@/lib/rateLimit";

export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().max(80).optional(),
});

export async function POST(req: Request) {
  // Signups grant free credits, so unlimited registration == unlimited free
  // LLM spend. 5 signups per IP per hour is generous for a real user, tight
  // for a farming script.
  if (isRateLimited(`register:${clientIp(req)}`, 5, 60 * 60 * 1000)) {
    return Response.json({ error: "Too many signups, try again later" }, { status: 429 });
  }

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase().trim();

  const freeCredits = Number(process.env.SIGNUP_FREE_CREDITS ?? "100");
  // Hash before opening the transaction so the (deliberately slow) KDF never holds it open.
  const passwordHash = hashPassword(parsed.data.password);

  try {
    // One transaction: if the grant fails the account is rolled back too, so there is never a user without
    // their signup credits (or a half-created account blocking a retry with the same email).
    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          name: parsed.data.name,
          passwordHash,
        },
      });
      if (Number.isInteger(freeCredits) && freeCredits > 0) {
        await grantCreditsInTx(tx, created.id, freeCredits, "signup");
      }
      return created;
    });
    return Response.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (error) {
    // The unique index on email is the duplicate check (no separate lookup to race against).
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "Email already registered" }, { status: 409 });
    }
    throw error;
  }
}
