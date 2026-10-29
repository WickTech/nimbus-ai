import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The chat endpoint end to end on a real database, with the language model replaced by the AI SDK's mock
 * (no network, no key). Checks the billing rules: 1 credit is reserved before the model is called, the rest of
 * the cost is settled from the real token usage, and a failed model call does not cost the user anything.
 */

// ---- test doubles -------------------------------------------------------------------------------------
const model = vi.hoisted(() => ({
  calls: 0,
  fail: false,
  reply: "Hello from the mock model",
  promptTokens: 10,
  completionTokens: 30,
}));

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/ai", async () => {
  const { MockLanguageModelV1, simulateReadableStream } = await import("ai/test");
  return {
    SYSTEM_PROMPT: "test",
    chatModel: new MockLanguageModelV1({
      doStream: async () => {
        model.calls += 1;
        if (model.fail) throw new Error("upstream is down");
        return {
          stream: simulateReadableStream({
            chunks: [
              { type: "text-delta" as const, textDelta: model.reply },
              {
                type: "finish" as const,
                finishReason: "stop" as const,
                usage: { promptTokens: model.promptTokens, completionTokens: model.completionTokens },
              },
            ],
          }),
          rawCall: { rawPrompt: null, rawSettings: {} },
        };
      },
    }),
  };
});

// `after()` only works inside a Next.js request; here it just runs the callback.
vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  after: (callback: () => unknown) => void callback(),
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { grantCredits } from "@/lib/credits";
import { POST } from "@/app/api/chat/route";

// ---- helpers ------------------------------------------------------------------------------------------
afterAll(() => db.$disconnect());

beforeEach(() => {
  model.calls = 0;
  model.fail = false;
  model.promptTokens = 10;
  model.completionTokens = 30;
});

async function newUser(credits: number): Promise<string> {
  const user = await db.user.create({ data: { email: `chat-${randomUUID()}@example.test` } });
  if (credits > 0) await grantCredits(db, user.id, credits, "seed");
  return user.id;
}

function signedInAs(userId: string | null) {
  vi.mocked(auth).mockResolvedValue((userId ? { user: { id: userId } } : null) as never);
}

function chat(body: unknown, conversationId?: string) {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(typeof body === "string" ? { messages: [{ role: "user", content: body }], conversationId } : body),
    }),
  );
}

const credits = async (userId: string) => (await db.user.findUniqueOrThrow({ where: { id: userId } })).credits;

/** Reads the whole streamed response, then waits for the billing and persistence that run after it. */
async function readAll(res: Response) {
  return await res.text();
}

// ---- tests --------------------------------------------------------------------------------------------
describe("POST /api/chat", () => {
  it("answers 401 without a session and never calls the model", async () => {
    signedInAs(null);
    const res = await chat("hi");
    expect(res.status).toBe(401);
    expect(model.calls).toBe(0);
  });

  it("answers 400 for a malformed body and charges nothing", async () => {
    const userId = await newUser(5);
    signedInAs(userId);

    expect((await chat({ messages: [] })).status).toBe(400);
    expect((await chat({ messages: [{ role: "user", content: "" }] })).status).toBe(400);
    expect((await chat({})).status).toBe(400);

    expect(await credits(userId)).toBe(5);
    expect(model.calls).toBe(0);
  });

  it("charges 1 credit for a short answer and saves the conversation", async () => {
    const userId = await newUser(5);
    signedInAs(userId);

    const res = await chat("What is a ledger?");
    expect(res.status).toBe(200);
    expect(await readAll(res)).toContain("Hello from the mock model");

    await vi.waitFor(async () => expect(await db.message.count({ where: { conversation: { userId } } })).toBe(2));
    expect(await credits(userId)).toBe(4);
    const convo = await db.conversation.findFirstOrThrow({ where: { userId }, include: { messages: true } });
    expect(convo.title).toBe("What is a ledger?");
    expect(convo.messages.map((m) => [m.role, m.content])).toEqual(
      expect.arrayContaining([
        ["user", "What is a ledger?"],
        ["assistant", "Hello from the mock model"],
      ]),
    );
  });

  it("settles a long answer from the real token usage (2,500 tokens = 3 credits)", async () => {
    const userId = await newUser(10);
    signedInAs(userId);
    model.promptTokens = 500;
    model.completionTokens = 2000;

    await readAll(await chat("Write me an essay"));

    await vi.waitFor(async () => expect(await credits(userId)).toBe(7));
    const reasons = (await db.creditLedger.findMany({ where: { userId }, orderBy: { createdAt: "asc" } })).map(
      (l) => [l.reason, l.delta],
    );
    expect(reasons).toEqual(
      expect.arrayContaining([
        ["chat:reserve", -1],
        ["chat:reconcile", -2],
      ]),
    );
  });

  it("answers 402 with a clear message when the balance is zero, without calling the model", async () => {
    const userId = await newUser(0);
    signedInAs(userId);

    const res = await chat("anything");

    expect(res.status).toBe(402);
    expect((await res.json()).error).toMatch(/out of credits/i);
    expect(model.calls).toBe(0);
    expect(await credits(userId)).toBe(0);
  });

  it("does not charge the user when the model call fails", async () => {
    const userId = await newUser(5);
    signedInAs(userId);
    model.fail = true;

    const res = await chat("this will fail upstream");
    await readAll(res).catch(() => undefined);

    await vi.waitFor(async () => expect(await credits(userId)).toBe(5));
    const refund = await db.creditLedger.findFirst({ where: { userId, reason: "chat:refund" } });
    expect(refund?.delta).toBe(1);
  });

  it("refuses another user's conversation with a 404, before billing and before calling the model", async () => {
    const alice = await newUser(5);
    const bob = await newUser(5);
    signedInAs(alice);
    await readAll(await chat("Alice's private question"));
    await vi.waitFor(async () => expect(await db.conversation.count({ where: { userId: alice } })).toBe(1));
    const aliceConvo = await db.conversation.findFirstOrThrow({ where: { userId: alice } });
    const before = await db.message.count({ where: { conversationId: aliceConvo.id } });
    model.calls = 0;

    signedInAs(bob);
    const res = await chat("Bob tries to write into it", aliceConvo.id);

    expect(res.status).toBe(404);
    expect(model.calls).toBe(0);
    expect(await credits(bob)).toBe(5);
    expect(await db.message.count({ where: { conversationId: aliceConvo.id } })).toBe(before);
    expect(await db.conversation.count({ where: { userId: bob } })).toBe(0);
  });

  it("tells the client the id of a new conversation, and follow-ups with that id stay in the same conversation", async () => {
    const userId = await newUser(10);
    signedInAs(userId);

    const first = await chat("first question");
    const id = first.headers.get("x-conversation-id");
    expect(id).toBeTruthy();
    await readAll(first);
    await vi.waitFor(async () => expect(await db.message.count({ where: { conversationId: id! } })).toBe(2));

    const second = await chat("second question", id!);
    expect(second.headers.get("x-conversation-id")).toBe(id);
    await readAll(second);
    await vi.waitFor(async () => expect(await db.message.count({ where: { conversationId: id! } })).toBe(4));

    const all = await db.conversation.findMany({ where: { userId }, include: { messages: { orderBy: { createdAt: "asc" } } } });
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe("first question");
    expect(all[0].messages.filter((m) => m.role === "user").map((m) => m.content)).toEqual(["first question", "second question"]);
  });

  it("leaves no empty conversation behind when the very first message fails upstream", async () => {
    const userId = await newUser(5);
    signedInAs(userId);
    model.fail = true;

    const res = await chat("this will fail upstream");
    await readAll(res).catch(() => undefined);

    await vi.waitFor(async () => expect(await credits(userId)).toBe(5));
    await vi.waitFor(async () => expect(await db.conversation.count({ where: { userId } })).toBe(0));
  });
});
