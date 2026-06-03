import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { grantCredits } from "@/lib/credits";

export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().max(80).optional(),
});

export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase().trim();

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json({ error: "Email already registered" }, { status: 409 });
  }

  const user = await db.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash: hashPassword(parsed.data.password),
    },
  });

  const freeCredits = Number(process.env.SIGNUP_FREE_CREDITS ?? "100");
  await grantCredits(db, user.id, freeCredits, "signup");

  return Response.json({ id: user.id, email: user.email }, { status: 201 });
}
