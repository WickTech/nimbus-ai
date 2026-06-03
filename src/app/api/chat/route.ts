import { streamText } from "ai";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chatModel, SYSTEM_PROMPT } from "@/lib/ai";
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

  // Pre-flight: a request must cost at least 1 credit. Block empty wallets
  // before we spend money on the upstream model.
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.credits < 1) {
    return Response.json(
      { error: "Out of credits. Top up to keep chatting." },
      { status: 402 },
    );
  }

  const result = streamText({
    model: chatModel,
    system: SYSTEM_PROMPT,
    messages,
    // Reconcile billing + persistence once the full response is known.
    async onFinish({ text, usage }) {
      const totalTokens =
        usage?.totalTokens ?? Math.ceil((text.length + lastUserLen(messages)) / 4);
      const cost = tokensToCredits(totalTokens);

      try {
        await spendCredits(db, userId, cost, "chat");
      } catch (err) {
        if (!(err instanceof InsufficientCreditsError)) throw err;
        // Overspend on a streamed response: floor the wallet to 0.
        await spendCredits(db, userId, user.credits, "chat").catch(() => {});
      }

      await persistTurn(conversationId, userId, messages, text, totalTokens);
    },
  });

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
