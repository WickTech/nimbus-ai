import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isRateLimited } from "@/lib/rateLimit";
import { hashPassword, verifyPassword } from "@/lib/password";

export const runtime = "nodejs";

const Schema = z.object({
  currentPassword: z.string().max(128).optional(),
  newPassword: z.string().min(8, "New password must be at least 8 characters.").max(128),
});

/**
 * Change the password. Accounts that have one must prove they know the current one. Accounts that signed up
 * with an OAuth provider have none yet, so they may set one without it.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const userId = session.user.id;

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const { currentPassword, newPassword } = parsed.data;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return new Response("Unauthorized", { status: 401 });

  if (user.passwordHash) {
    if (isRateLimited(`account-password:${userId}`, 5, 15 * 60 * 1000)) {
      return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }
    if (!currentPassword || !verifyPassword(currentPassword, user.passwordHash).ok) {
      return Response.json({ error: "Current password is incorrect." }, { status: 400 });
    }
    if (currentPassword === newPassword) {
      return Response.json({ error: "Choose a password different from the current one." }, { status: 400 });
    }
  }

  await db.user.update({ where: { id: userId }, data: { passwordHash: hashPassword(newPassword) } });
  return Response.json({ ok: true });
}
