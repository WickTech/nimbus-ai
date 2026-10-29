import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isRateLimited } from "@/lib/rateLimit";
import { verifyPassword } from "@/lib/password";

export const runtime = "nodejs";

const ProfileSchema = z.object({
  name: z.string().trim().max(80),
});

const DeleteSchema = z.object({
  confirmEmail: z.string().min(1),
  password: z.string().max(128).optional(),
});

/** Update the profile. An empty name clears it. */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const parsed = ProfileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Name must be 80 characters or fewer." }, { status: 400 });
  }

  const name = parsed.data.name || null;
  const updated = await db.user.updateMany({ where: { id: session.user.id }, data: { name } });
  if (updated.count === 0) return new Response("Unauthorized", { status: 401 });

  return Response.json({ name });
}

/**
 * Permanently delete the account. The user must type their email, and password accounts must also give the
 * password. Conversations, messages, ledger rows, sessions and linked accounts go with the user (cascade).
 */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const userId = session.user.id;

  const parsed = DeleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Type your email to confirm." }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return new Response("Unauthorized", { status: 401 });

  if (parsed.data.confirmEmail.trim().toLowerCase() !== user.email) {
    return Response.json({ error: "That is not your email address." }, { status: 400 });
  }

  if (user.passwordHash) {
    // Same guess limit as changing the password: this is a password check too.
    if (isRateLimited(`account-password:${userId}`, 5, 15 * 60 * 1000)) {
      return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }
    if (!parsed.data.password || !verifyPassword(parsed.data.password, user.passwordHash).ok) {
      return Response.json({ error: "Password is incorrect." }, { status: 400 });
    }
  }

  await db.user.delete({ where: { id: userId } });
  return Response.json({ deleted: true });
}
