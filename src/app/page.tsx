import { SiteNav } from "@/components/SiteNav";
import { ClosingCta } from "@/components/landing/closing-cta";
import { Features } from "@/components/landing/features";
import { Flow } from "@/components/landing/flow";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HeroGlow } from "@/components/landing/hero-glow";
import { Pricing } from "@/components/landing/pricing";
import { StackRow } from "@/components/landing/stack-row";

export default function Landing() {
  return (
    <div className="relative bg-zinc-950 text-zinc-100 antialiased">
      <a
        href="#main"
        className="sr-only z-30 rounded-lg bg-emerald-700 px-4 py-2 text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      {/* The nav floats over the top of the page (absolute), so the glow wrapper below starts at y = 0 and runs behind it. */}
      <SiteNav />
      <main id="main">
        {/* First screen: hero text and the "built with" row share one full-height wrapper and one glow. */}
        <div className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden">
          <HeroGlow />
          <Hero />
          <StackRow />
        </div>

        <Features />
        <Flow />

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
