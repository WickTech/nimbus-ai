import type { Lang } from "./code-tokens";

/**
 * Code excerpts shown on the landing page. They are condensed from real files (long lines wrapped, some lines
 * left out), and `anchors` lists exact fragments that must still exist in `source`, so the page cannot drift
 * away from the code it claims to show. `__tests__/landing-snippets.test.ts` checks both that and the line width.
 */
export type Snippet = {
  /** Shown as the caption. */
  file: string;
  /** Repo path the excerpt comes from. */
  source: string;
  lang: Lang;
  code: string;
  anchors: string[];
};

export const heroSnippet: Snippet = {
  file: "src/app/api/chat/route.ts",
  source: "src/app/api/chat/route.ts",
  lang: "ts",
  code: `const reserved = tokensToCredits(
  estimateInputTokens(messages, SYSTEM_PROMPT) +
    MAX_OUTPUT_TOKENS,
);
await spendCredits(db, userId, reserved, "chat:reserve");

const result = streamText({
  model: chatModel,
  system: SYSTEM_PROMPT,
  messages,
  maxTokens: MAX_OUTPUT_TOKENS,
  async onFinish({ text, usage }) {
    await settleReserve(
      userId,
      reserved,
      tokensToCredits(totalTokens),
    );
  },
});`,
  anchors: [
    "estimateInputTokens(messages, SYSTEM_PROMPT) + MAX_OUTPUT_TOKENS",
    'spendCredits(db, userId, reserved, "chat:reserve")',
    "const result = streamText({",
    "async onFinish({ text, usage })",
    "tokensToCredits(totalTokens)",
  ],
};

export const featureSnippets: Snippet[] = [
  {
    file: "src/app/api/chat/route.ts",
    source: "src/app/api/chat/route.ts",
    lang: "ts",
    code: `const result = streamText({
  model: chatModel,
  system: SYSTEM_PROMPT,
  messages,
  maxTokens: MAX_OUTPUT_TOKENS,
});

return result.toDataStreamResponse({
  headers: { "x-conversation-id": convoId },
});`,
    anchors: [
      "const result = streamText({",
      "model: chatModel,",
      "maxTokens: MAX_OUTPUT_TOKENS,",
      'toDataStreamResponse({ headers: { "x-conversation-id": convoId } })',
    ],
  },
  {
    file: "src/lib/credits.ts",
    source: "src/lib/credits.ts",
    lang: "ts",
    code: `const { count } = await tx.user.updateMany({
  where: { id: userId, credits: { gte: cost } },
  data: { credits: { decrement: cost } },
});

if (count === 0)
  throw new InsufficientCreditsError(user.credits);

await tx.creditLedger.create({
  data: {
    userId, delta: -cost, reason,
    balance: user.credits,
  },
});`,
    anchors: [
      "const { count } = await tx.user.updateMany({",
      "where: { id: userId, credits: { gte: cost } },",
      "data: { credits: { decrement: cost } },",
      "throw new InsufficientCreditsError(user.credits)",
      "await tx.creditLedger.create({",
    ],
  },
  {
    file: "prisma/schema.prisma",
    source: "prisma/schema.prisma",
    lang: "prisma",
    code: `model Conversation {
  id        String    @id @default(cuid())
  title     String    @default("New chat")
  userId    String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  messages  Message[]

  @@index([userId])
}`,
    anchors: [
      "model Conversation {",
      'title     String    @default("New chat")',
      "messages  Message[]",
      "@@index([userId])",
    ],
  },
];
