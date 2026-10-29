import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const RenameSchema = z.object({ title: z.string().trim().min(1, "Give the chat a name.").max(100) });

type Ctx = { params: Promise<{ id: string }> };

/** Rename one of the caller's conversations. */
export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;

  const parsed = RenameSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid title." }, { status: 400 });
  }

  // Scoped to the owner in the query itself: someone else's id simply matches nothing.
  const updated = await db.conversation.updateMany({
    where: { id, userId: session.user.id },
    data: { title: parsed.data.title },
  });
  if (updated.count === 0) return Response.json({ error: "Conversation not found" }, { status: 404 });

  return Response.json({ title: parsed.data.title });
}

/** Delete one of the caller's conversations and its messages. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;

  const deleted = await db.conversation.deleteMany({ where: { id, userId: session.user.id } });
  if (deleted.count === 0) return Response.json({ error: "Conversation not found" }, { status: 404 });

  return Response.json({ deleted: true });
}
