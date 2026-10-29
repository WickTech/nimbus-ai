import { streamText } from "ai";
import { after } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isRateLimited } from "@/lib/rateLimit";
import { chatModel, SYSTEM_PROMPT } from "@/lib/ai";
import { chatTelemetry, flushTelemetry } from "@/lib/telemetry";
import {
  InsufficientCreditsError,
  grantCredits,
  spendCredits,
  tokensToCredits,
} from "@/lib/credits";

export const runtime = "nodejs";

const BodySchema = z.object({
  conversationId: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1).max(8000),
      }),
    )
    .min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  // Burst guard on top of the credit balance: 30 messages a minute per user. Checked before any billing.
  if (isRateLimited(`chat:${userId}`, 30, 60_000)) {
    return Response.json({ error: "Too many messages. Slow down." }, { status: 429 });
  }

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { messages, conversationId } = parsed.data;

  // A conversation id that is not the caller's is refused before anything is billed (it used to be
  // ignored silently after the model had already been paid for).
  if (conversationId) {
    const owned = await db.conversation.findFirst({ where: { id: conversationId, userId }, select: { id: true } });
    if (!owned) return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Reserve the minimum charge atomically *before* calling the upstream
  // model. Concurrent requests now serialize on this deduction instead of
  // all reading the same balance and all incurring real OpenAI cost before
  // any of them get billed.
  try {
    await spendCredits(db, userId, 1, "chat:reserve");
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return Response.json(
        { error: "Out of credits. Top up to keep chatting." },
        { status: 402 },
      );
    }
    throw err;
  }

  // Give a new chat its row now, so the client can be told its id and send it with every follow-up. Without
  // that, each follow-up created yet another conversation and one chat was split across the history.
  let activeId = conversationId;
  const createdHere = !conversationId;
  if (!activeId) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const created = await db.conversation.create({
      data: { userId, title: (lastUser?.content ?? "New chat").slice(0, 60) },
      select: { id: true },
    });
    activeId = created.id;
  }
  const convoId = activeId;

  const result = streamText({
    model: chatModel,
    system: SYSTEM_PROMPT,
    messages,
    experimental_telemetry: chatTelemetry({ userId, conversationId: convoId }),
    // The model call failed, so the user got nothing: give back the credit reserved above.
    // (onFinish never runs for a failed call, so this cannot refund twice.)
    async onError({ error }) {
      console.error("chat: upstream model error, refunding the reserved credit", error);
      await grantCredits(db, userId, 1, "chat:refund").catch((err) =>
        console.error("chat: refund failed", err),
      );
      // Nothing was saved for a chat that failed on its very first message: do not leave an empty entry behind.
      if (createdHere) {
        await db.conversation
          .deleteMany({ where: { id: convoId, userId } })
          .catch((err) => console.error("chat: could not remove the empty conversation", err));
      }
    },
    // Reconcile billing + persistence once the full response is known.
    async onFinish({ text, usage }) {
      const totalTokens =
        usage?.totalTokens ?? Math.ceil((text.length + lastUserLen(messages)) / 4);
      const cost = tokensToCredits(totalTokens);
      const remainder = cost - 1; // 1 credit already reserved up front

      if (remainder > 0) {
        try {
          await spendCredits(db, userId, remainder, "chat:reconcile");
        } catch (err) {
          if (!(err instanceof InsufficientCreditsError)) throw err;
          // Overspend on a streamed response: floor the wallet to 0.
          await spendCredits(db, userId, err.balance, "chat:reconcile").catch(() => {});
        }
      }

      await persistTurn(convoId, userId, messages, text, totalTokens);
    },
  });

  // Runs after the stream closes, so trace export never delays tokens.
  after(flushTelemetry);

  return result.toDataStreamResponse({ headers: { "x-conversation-id": convoId } });
}

function lastUserLen(messages: { role: string; content: string }[]): number {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  return lastUser?.content.length ?? 0;
}

async function persistTurn(
  conversationId: string,
  userId: string,
  messages: { role: string; content: string }[],
  assistantText: string,
  tokens: number,
) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");

  const convo = await db.conversation.findFirst({ where: { id: conversationId, userId }, select: { id: true } });
  if (!convo) return; // deleted while the reply was streaming

  await db.message.createMany({
    data: [
      ...(lastUser ? [{ conversationId: convo.id, role: "user", content: lastUser.content }] : []),
      { conversationId: convo.id, role: "assistant", content: assistantText, tokens },
    ],
  });
  await db.conversation.update({
    where: { id: convo.id },
    data: { updatedAt: new Date() },
  });
}
