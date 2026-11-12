import { streamText } from "ai";
import { after } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isRateLimited } from "@/lib/rateLimit";
import { chatModel, SYSTEM_PROMPT } from "@/lib/ai";
import { chatTelemetry, flushTelemetry } from "@/lib/telemetry";
import { MAX_MESSAGES, MAX_MESSAGE_CHARS, MAX_OUTPUT_TOKENS, MAX_TOTAL_CHARS } from "@/lib/chat-limits";
import {
  InsufficientCreditsError,
  grantCredits,
  spendCredits,
  tokensToCredits,
} from "@/lib/credits";

export const runtime = "nodejs";

// Request size bounds (shared with the client, which trims its history to them) cap what one request can
// cost upstream, together with MAX_OUTPUT_TOKENS.
// Reserve estimate inputs (see estimateInputTokens).
const CHARS_PER_TOKEN_ESTIMATE = 2;
const PER_MESSAGE_TOKEN_OVERHEAD = 4;

const BodySchema = z.object({
  conversationId: z.string().optional(),
  messages: z
    .array(
      z.object({
        // No "system" role from the client: the system prompt is set server-side only.
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(MAX_MESSAGE_CHARS),
      }),
    )
    .min(1)
    .max(MAX_MESSAGES)
    .refine((msgs) => totalChars(msgs) <= MAX_TOTAL_CHARS, {
      message: `Messages may not exceed ${MAX_TOTAL_CHARS} characters in total`,
    }),
});

function totalChars(messages: { content: string }[]): number {
  return messages.reduce((sum, m) => sum + m.content.length, 0);
}

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

  // Reserve the worst case atomically *before* calling the upstream model: the estimated input plus the
  // full output cap. Concurrent requests serialize on this deduction, and a balance that cannot cover the
  // worst case is refused here (fail closed) instead of after the provider has been paid.
  const reserved = tokensToCredits(estimateInputTokens(messages, SYSTEM_PROMPT) + MAX_OUTPUT_TOKENS);
  try {
    await spendCredits(db, userId, reserved, "chat:reserve");
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return Response.json(
        { error: "Out of credits. Top up to keep chatting." },
        { status: 402 },
      );
    }
    throw err;
  }

  // Each request settles its reserve exactly once: on finish (charge actual usage) or on error (refund all),
  // whichever runs first. This guards against a double charge or a refund larger than the reserve.
  let settled = false;

  // Give a new chat its row now, so the client can be told its id and send it with every follow-up. Without
  // that, each follow-up created yet another conversation and one chat was split across the history.
  let activeId = conversationId;
  const createdHere = !conversationId;
  if (!activeId) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    try {
      const created = await db.conversation.create({
        data: { userId, title: (lastUser?.content ?? "New chat").slice(0, 60) },
        select: { id: true },
      });
      activeId = created.id;
    } catch (err) {
      // The model was never called: give the reserve back before failing the request.
      settled = true;
      await grantCredits(db, userId, reserved, "chat:refund").catch((e) => console.error("chat: refund failed", e));
      throw err;
    }
  }
  const convoId = activeId;

  const result = streamText({
    model: chatModel,
    system: SYSTEM_PROMPT,
    messages,
    maxTokens: MAX_OUTPUT_TOKENS,
    experimental_telemetry: chatTelemetry({ userId, conversationId: convoId }),
    // The model call failed, so the user got nothing: give back the whole reserve.
    async onError({ error }) {
      console.error("chat: upstream model error, refunding the reserve", error);
      if (!settled) {
        settled = true;
        await grantCredits(db, userId, reserved, "chat:refund").catch((err) =>
          console.error("chat: refund failed", err),
        );
      }
      // Nothing was saved for a chat that failed on its very first message: do not leave an empty entry behind.
      if (createdHere) {
        await db.conversation
          .deleteMany({ where: { id: convoId, userId } })
          .catch((err) => console.error("chat: could not remove the empty conversation", err));
      }
    },
    // Settle billing + persist once the full response is known. Never throws: a failure here is logged.
    async onFinish({ text, usage }) {
      const reported = usage?.totalTokens;
      // Providers that report no usage give NaN in this SDK version; fall back to a conservative estimate.
      const totalTokens =
        typeof reported === "number" && Number.isFinite(reported) && reported >= 0
          ? reported
          : estimateInputTokens(messages, SYSTEM_PROMPT) + Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);

      if (!settled) {
        settled = true;
        try {
          await settleReserve(userId, reserved, tokensToCredits(totalTokens));
        } catch (err) {
          console.error("chat: settling the reserve failed", err);
        }
      }

      try {
        await persistTurn(convoId, userId, messages, text, totalTokens);
      } catch (err) {
        console.error("chat: saving the turn failed", err);
      }
    },
  });

  // Runs after the stream closes, so trace export never delays tokens.
  after(flushTelemetry);

  return result.toDataStreamResponse({ headers: { "x-conversation-id": convoId } });
}

/**
 * Conservative input-token estimate for the reserve: 1 token per 2 characters (English averages about 4),
 * plus a small per-message overhead for the chat format, including the server-side system prompt.
 */
function estimateInputTokens(messages: { content: string }[], systemPrompt: string): number {
  const chars = totalChars(messages) + systemPrompt.length;
  return Math.ceil(chars / CHARS_PER_TOKEN_ESTIMATE) + PER_MESSAGE_TOKEN_OVERHEAD * (messages.length + 1);
}

/**
 * Settle a reserve against the actual cost. Refunds the unused part (never more than was reserved); if the
 * actual cost is higher, charges the difference but no more than the balance allows, so it never goes below 0.
 */
async function settleReserve(userId: string, reserved: number, actual: number) {
  if (actual < reserved) {
    await grantCredits(db, userId, reserved - actual, "chat:release");
    return;
  }
  const extra = actual - reserved;
  if (extra <= 0) return;
  try {
    await spendCredits(db, userId, extra, "chat:reconcile");
  } catch (err) {
    if (!(err instanceof InsufficientCreditsError)) throw err;
    // Overspend on a streamed response: take what is left and floor the wallet at 0.
    const take = Math.min(extra, err.balance);
    if (take > 0) await spendCredits(db, userId, take, "chat:reconcile");
  }
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
