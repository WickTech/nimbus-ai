import { SiteNav } from "@/components/SiteNav";
import { ClosingCta } from "@/components/landing/closing-cta";
import { CodeFrame } from "@/components/landing/code-frame";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Pricing } from "@/components/landing/pricing";
import { featureSnippets } from "@/components/landing/snippets";
import { StackRow } from "@/components/landing/stack-row";
import { StickyScroll } from "@/components/ui/sticky-scroll-reveal";
import { TracingBeam } from "@/components/ui/tracing-beam";

// The panel next to each feature is a real excerpt of the file that implements it (see landing/snippets.ts).
const features = [
  {
    title: "Streaming chat",
    description:
      "Token-by-token responses through the Vercel AI SDK, rendered as Markdown with sanitised output.",
    content: <CodeFrame snippet={featureSnippets[0]} variant="bare" />,
  },
  {
    title: "Credit billing",
    description:
      "Every request debits an atomic ledger, priced per 1k tokens. Top up with Stripe Checkout when credits run low.",
    content: <CodeFrame snippet={featureSnippets[1]} variant="bare" />,
  },
  {
    title: "Auth + persistence",
    description:
      "NextAuth credentials sign-in and Prisma store every conversation, so users resume where they left off.",
    content: <CodeFrame snippet={featureSnippets[2]} variant="bare" />,
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

export default function Landing() {
  return (
    <div className="bg-zinc-950 text-zinc-100 antialiased">
      <a
        href="#main"
        className="sr-only z-30 rounded-lg bg-emerald-700 px-4 py-2 text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <SiteNav />
      <main id="main">
        <Hero />
        <StackRow />

        <section id="features" className="mx-auto max-w-5xl px-6 py-24">
          <h2 className="mb-10 text-3xl font-semibold tracking-tight">What is wired together</h2>
          <StickyScroll content={features} contentClassName="h-[21rem] w-[30rem] shrink-0 rounded-2xl p-px" />
        </section>

        <section id="flow" className="px-6 py-24">
          <h2 className="mx-auto mb-16 max-w-5xl px-6 text-3xl font-semibold tracking-tight">How a request flows</h2>
          <TracingBeam className="px-6">
            <ol className="mx-auto max-w-2xl space-y-16 pl-6 sm:pl-0">
              {flow.map((step) => (
                <li key={step.title}>
                  <h3 className="mb-3 text-xl font-semibold text-emerald-300">{step.title}</h3>
                  <p className="max-w-prose leading-relaxed text-zinc-400">{step.body}</p>
                </li>
              ))}
            </ol>
          </TracingBeam>
        </section>

        <section id="pricing" className="mx-auto max-w-5xl px-6 pb-24 pt-12">
          <h2 className="text-3xl font-semibold tracking-tight">Pay as you go</h2>
          <p className="mt-3 max-w-xl text-zinc-400">
            No subscription. Buy credits when you need them; one credit is about 1k tokens.
          </p>
          <Pricing />
        </section>

        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}
