/**
 * Landing-page content as plain data (no JSX), so vitest can check it against the code it describes.
 * `__tests__/landing-content.test.ts` anchors every ledger reason to its source file, the packs to the Stripe
 * config, and the sample chat to the real pricing rule.
 */

export const HERO_LEDE =
  "A production-shaped starter: streaming LLM chat, credential auth, conversation persistence, and a transactional usage-based credit ledger, all wired together.";

export const FEATURES = [
  {
    id: "chat",
    title: "Streaming chat",
    description:
      "Token-by-token responses through the Vercel AI SDK, rendered as Markdown with sanitised output.",
  },
  {
    id: "credits",
    title: "Credit billing",
    description:
      "Every request debits an atomic ledger, priced per 1k tokens. Top up with Stripe Checkout when credits run low.",
  },
  {
    id: "auth",
    title: "Auth + persistence",
    description:
      "NextAuth credentials sign-in and Prisma store every conversation, so users resume where they left off.",
  },
] as const;

/**
 * Sample conversation for the chat visual. The pricing rule is the real one (src/lib/credits.ts): 1 credit per
 * 1k tokens, rounded up, at least 1 credit per request, so 1,412 tokens is 2 credits.
 */
export const CHAT_SAMPLE = {
  messages: [
    { role: "user", text: "What does one message cost?" },
    { role: "assistant", text: "Usage is priced at 1 credit per 1k tokens, rounded up, with a minimum of 1 credit per request." },
    { role: "user", text: "Why did that reply cost 2 credits?" },
    { role: "assistant", text: "It used 1,412 tokens. One credit covers about 1k tokens and usage rounds up, so the charge was 2 credits." },
  ] as { role: "user" | "assistant"; text: string }[],
  tokens: 1412,
  tokensLabel: "1,412 tokens",
};

/** Sample sidebar for the history visual. Group labels are the real ones (`BUCKETS` in src/lib/history.ts). */
export const HISTORY_SAMPLE = {
  today: [
    { title: "Refund policy draft", active: true },
    { title: "New chat", active: false }, // the schema default title
  ],
  yesterday: [{ title: "Prisma index question", active: false }],
  note: "Password stored as a scrypt hash",
};

export type LedgerEntry = {
  /** The `reason` string written to the ledger. */
  reason: string;
  sign: "credit" | "debit";
  note: string;
  /** Repo path where the reason string lives. */
  source: string;
};

export type FlowIcon = "signup" | "chat" | "bill" | "topup";

export const FLOW: { title: string; body: string; icon: FlowIcon; entries: LedgerEntry[] }[] = [
  {
    title: "1. Sign up",
    body: "Register with email and password (scrypt-hashed). New accounts get free credits, recorded as a ledger entry.",
    icon: "signup",
    entries: [
      { reason: "signup", sign: "credit", note: "Free credits granted", source: "src/app/api/register/route.ts" },
    ],
  },
  {
    title: "2. Chat",
    // The reserve is the estimated worst case (always 2 credits or more), not a single credit.
    body: "Credits are reserved before the model is called. The answer streams back token by token and is saved to your history.",
    icon: "chat",
    entries: [
      { reason: "chat:reserve", sign: "debit", note: "Held before the model runs", source: "src/app/api/chat/route.ts" },
    ],
  },
  {
    title: "3. Pay for what you use",
    body: "The final bill comes from the real token usage. A failed model call is refunded, and a spend can never overdraw the balance.",
    icon: "bill",
    entries: [
      { reason: "chat:release", sign: "credit", note: "Unused reserve returned", source: "src/app/api/chat/route.ts" },
      { reason: "chat:refund", sign: "credit", note: "Failed call refunded", source: "src/app/api/chat/route.ts" },
    ],
  },
  {
    title: "4. Top up",
    body: "Out of credits? Buy a pack through Stripe Checkout and the webhook reconciles the ledger.",
    icon: "topup",
    entries: [
      { reason: "topup", sign: "credit", note: "Added by the Stripe webhook", source: "src/app/api/stripe/webhook/route.ts" },
    ],
  },
];

/** Mirrors CREDIT_PACKAGES in src/lib/stripe.ts (credits and dollars); 1 credit is about 1k tokens. */
export const PACKS = [
  { credits: 100, dollars: 1, blurb: "About 100k tokens. Enough to try the app out.", best: false },
  { credits: 500, dollars: 4, blurb: "About 500k tokens, for regular use at a lower price per credit.", best: false },
  { credits: 2000, dollars: 14, blurb: "About 2M tokens, the best price per credit.", best: true },
];
