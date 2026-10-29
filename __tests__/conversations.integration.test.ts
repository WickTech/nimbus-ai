import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/** Renaming and deleting conversations on a real database, with only the session mocked. */
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PATCH, DELETE } from "@/app/api/conversations/[id]/route";

afterAll(() => db.$disconnect());
beforeEach(() => vi.mocked(auth).mockReset());

const signedInAs = (id: string | null) => vi.mocked(auth).mockResolvedValue((id ? { user: { id } } : null) as never);
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const rename = (id: string, body: unknown) =>
  PATCH(new Request("http://localhost/api/conversations/x", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), ctx(id));
const remove = (id: string) => DELETE(new Request("http://localhost/api/conversations/x", { method: "DELETE" }), ctx(id));

async function newChat(title = "Original title") {
  const user = await db.user.create({ data: { email: `conv-${randomUUID()}@example.test` } });
  const convo = await db.conversation.create({ data: { userId: user.id, title } });
  await db.message.createMany({
    data: [
      { conversationId: convo.id, role: "user", content: "hi" },
      { conversationId: convo.id, role: "assistant", content: "hello" },
    ],
  });
  return { userId: user.id, id: convo.id };
}

describe("PATCH /api/conversations/[id]", () => {
  it("answers 401 without a session", async () => {
    const { id } = await newChat();
    signedInAs(null);
    expect((await rename(id, { title: "x" })).status).toBe(401);
  });

  it("renames the caller's conversation and trims the title", async () => {
    const { userId, id } = await newChat();
    signedInAs(userId);

    const res = await rename(id, { title: "  Quarterly plan  " });

    expect(res.status).toBe(200);
    expect((await db.conversation.findUniqueOrThrow({ where: { id } })).title).toBe("Quarterly plan");
  });

  it("rejects an empty or over-long title", async () => {
    const { userId, id } = await newChat();
    signedInAs(userId);

    expect((await rename(id, { title: "   " })).status).toBe(400);
    expect((await rename(id, { title: "x".repeat(101) })).status).toBe(400);
    expect((await rename(id, {})).status).toBe(400);
    expect((await db.conversation.findUniqueOrThrow({ where: { id } })).title).toBe("Original title");
  });

  it("answers 404 for someone else's conversation and changes nothing", async () => {
    const mine = await newChat();
    const theirs = await newChat("Theirs");
    signedInAs(mine.userId);

    const res = await rename(theirs.id, { title: "Hijacked" });

    expect(res.status).toBe(404);
    expect((await db.conversation.findUniqueOrThrow({ where: { id: theirs.id } })).title).toBe("Theirs");
  });
});

describe("DELETE /api/conversations/[id]", () => {
  it("answers 401 without a session", async () => {
    const { id } = await newChat();
    signedInAs(null);
    expect((await remove(id)).status).toBe(401);
  });

  it("deletes the conversation and its messages", async () => {
    const { userId, id } = await newChat();
    signedInAs(userId);

    const res = await remove(id);

    expect(res.status).toBe(200);
    expect(await db.conversation.findUnique({ where: { id } })).toBeNull();
    expect(await db.message.count({ where: { conversationId: id } })).toBe(0);
  });

  it("answers 404 for someone else's conversation and deletes nothing", async () => {
    const mine = await newChat();
    const theirs = await newChat("Theirs");
    signedInAs(mine.userId);

    expect((await remove(theirs.id)).status).toBe(404);
    expect(await db.conversation.findUnique({ where: { id: theirs.id } })).not.toBeNull();
    expect(await db.message.count({ where: { conversationId: theirs.id } })).toBe(2);
  });

  it("answers 404 for an id that does not exist", async () => {
    const { userId } = await newChat();
    signedInAs(userId);
    expect((await remove("does-not-exist")).status).toBe(404);
  });
});
