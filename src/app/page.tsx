import Link from "next/link";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { HoverEffect } from "@/components/ui/card-hover-effect";
import { Spotlight } from "@/components/ui/spotlight";
import { StickyScroll } from "@/components/ui/sticky-scroll-reveal";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { TracingBeam } from "@/components/ui/tracing-beam";

const LEDE =
  "A production-shaped starter: streaming LLM chat, credential auth, conversation persistence, and a transactional usage-based credit ledger, all wired together.";

const Visual = ({ label, detail }: { label: string; detail: string }) => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center text-white">
    <span className="text-2xl font-bold">{label}</span>
    <span className="font-mono text-xs opacity-80">{detail}</span>
  </div>
);

const features = [
  {
    title: "Streaming chat",
    description:
      "Token-by-token responses through the Vercel AI SDK, rendered as Markdown with sanitised output.",
    content: <Visual label="/api/chat" detail="streamText → SSE" />,
  },
  {
    title: "Credit billing",
    description:
      "Every request debits an atomic ledger, priced per 1k tokens. Top up with Stripe Checkout when credits run low.",
    content: <Visual label="Credit ledger" detail="debit per 1k tokens" />,
  },
  {
    title: "Auth + persistence",
    description:
      "NextAuth credentials sign-in and Prisma store every conversation, so users resume where they left off.",
    content: <Visual label="NextAuth + Prisma" detail="Postgres (Neon)" />,
  },
];

const flow = [
  {
    title: "1. Sign up",
    body: "Register with email and password (scrypt-hashed). New accounts get free credits, recorded as a ledger entry.",
  },
  {
    title: "2. Chat",
    body: "One credit is reserved before the model is called. The answer streams back token by token and is saved to your history.",
  },
  {
    title: "3. Pay for what you use",
    body: "The final bill comes from the real token usage. A failed model call is refunded, and a spend can never overdraw the balance.",
  },
  {
    title: "4. Top up",
    body: "Out of credits? Buy a pack through Stripe Checkout and the webhook reconciles the ledger.",
  },
];

// Mirrors CREDIT_PACKAGES in src/lib/stripe.ts; 1 credit is about 1k tokens.
const packs = [
  {
    title: "100 credits — $1",
    description: "About 100k tokens. Enough to try the app out.",
    link: "/register?pack=100",
  },
  {
    title: "500 credits — $4",
    description: "About 500k tokens, for regular use at a lower price per credit.",
    link: "/register?pack=500",
  },
  {
    title: "2,000 credits — $14",
    description: "About 2M tokens, the best price per credit.",
    link: "/register?pack=2000",
  },
];

export default function Landing() {
  return (
    <main className="bg-zinc-950 text-zinc-100 antialiased">
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
        <Spotlight className="-top-40 left-0 overflow-visible md:-top-20 md:left-60" fill="#34d399" />
        <div className="relative z-10 flex max-w-3xl flex-col items-center gap-8">
          <span className="rounded-full bg-emerald-500/15 px-4 py-1 text-sm font-medium text-emerald-300">
            Full-stack AI SaaS starter
          </span>
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
            Ship an AI product, <span className="text-emerald-400">not boilerplate.</span>
          </h1>
          <TextGenerateEffect
            words={LEDE}
            className="max-w-xl [&_div]:!text-lg [&_div]:!font-normal [&_div]:!text-zinc-400 [&_span]:!text-zinc-400"
          />
          <div className="flex gap-4">
            <Link
              href="/chat"
              className="rounded-lg bg-emerald-700 px-6 py-3 font-medium text-white transition hover:bg-emerald-600"
            >
              Open the app →
            </Link>
            <Link
              href="https://github.com/WickTech/nimbus-ai"
              className="rounded-lg border border-zinc-700 px-6 py-3 font-medium text-zinc-100 transition hover:bg-zinc-900"
            >
              View source
            </Link>
          </div>
        </div>
        <BackgroundBeams />
      </section>

      <section className="mx-auto max-w-5xl px-6 py-24">
        <h2 className="mb-10 text-center text-3xl font-bold tracking-tight">
          What is wired together
        </h2>
        <StickyScroll content={features} />
      </section>

      <section className="px-6 py-24">
        <h2 className="mb-16 text-center text-3xl font-bold tracking-tight">
          How a request flows
        </h2>
        <TracingBeam className="px-6">
          <ol className="mx-auto max-w-2xl space-y-16 pl-6 sm:pl-0">
            {flow.map((step) => (
              <li key={step.title}>
                <h3 className="mb-3 text-xl font-semibold text-emerald-300">{step.title}</h3>
                <p className="leading-relaxed text-zinc-400">{step.body}</p>
              </li>
            ))}
          </ol>
        </TracingBeam>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-32 pt-12">
        <h2 className="text-center text-3xl font-bold tracking-tight">Pay as you go</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-zinc-400">
          No subscription. Buy credits when you need them; one credit is about 1k tokens.
        </p>
        <HoverEffect items={packs} />
      </section>
    </main>
  );
}
