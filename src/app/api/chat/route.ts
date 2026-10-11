import { streamText } from "ai";
import { after } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chatModel, SYSTEM_PROMPT } from "@/lib/ai";
import { chatTelemetry, flushTelemetry } from "@/lib/telemetry";
import {
  InsufficientCreditsError,
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

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { messages, conversationId } = parsed.data;

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

  const result = streamText({
    model: chatModel,
    system: SYSTEM_PROMPT,
    messages,
    experimental_telemetry: chatTelemetry({ userId, conversationId }),
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

      await persistTurn(conversationId, userId, messages, text, totalTokens);
    },
  });

  // Runs after the stream closes, so trace export never delays tokens.
  after(flushTelemetry);

  return result.toDataStreamResponse();
}

function lastUserLen(messages: { role: string; content: string }[]): number {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  return lastUser?.content.length ?? 0;
}

async function persistTurn(
  conversationId: string | undefined,
  userId: string,
  messages: { role: string; content: string }[],
  assistantText: string,
  tokens: number,
) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");

  const convo = conversationId
    ? await db.conversation.findFirst({ where: { id: conversationId, userId } })
    : await db.conversation.create({
        data: {
          userId,
          title: (lastUser?.content ?? "New chat").slice(0, 60),
        },
      });
  if (!convo) return;

  await db.message.createMany({
    data: [
      ...(lastUser
        ? [{ conversationId: convo.id, role: "user", content: lastUser.content }]
        : []),
      {
        conversationId: convo.id,
        role: "assistant",
        content: assistantText,
        tokens,
      },
    ],
  });
  await db.conversation.update({
    where: { id: convo.id },
    data: { updatedAt: new Date() },
  });
}
