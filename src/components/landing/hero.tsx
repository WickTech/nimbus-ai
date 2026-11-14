import type { CSSProperties } from "react";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Spotlight } from "@/components/ui/spotlight";
import { CodeFrame } from "./code-frame";
import { PrimaryCta, SecondaryCta } from "./cta";
import { heroSnippet } from "./snippets";

const LEDE =
  "A production-shaped starter: streaming LLM chat, credential auth, conversation persistence, and a transactional usage-based credit ledger, all wired together.";

// One page-load sequence (see .rise in globals.css): four steps, 80 ms apart. It plays only when the visitor
// has not asked for reduced motion.
const delay = (ms: number): CSSProperties => ({ "--rise-delay": `${ms}ms` }) as CSSProperties;

export function Hero() {
  return (
    <section className="relative flex min-h-[100dvh] items-center overflow-hidden pb-16 pt-24">
      <Spotlight className="-top-40 left-0 overflow-visible md:-top-20 md:left-60" fill="#34d399" />
      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center px-6 gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div className="flex flex-col items-start gap-7">
          <span
            style={delay(0)}
            className="rise rounded-full bg-emerald-500/15 px-4 py-1 text-sm font-medium text-emerald-300"
          >
            Full-stack AI SaaS starter
          </span>
          <h1
            style={delay(80)}
            className="rise text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl lg:leading-[1.05]"
          >
            Ship an AI product, <span className="text-emerald-400">not boilerplate.</span>
          </h1>
          <p style={delay(160)} className="rise max-w-xl text-pretty text-lg leading-relaxed text-zinc-400">
            {LEDE}
          </p>
          <div style={delay(240)} className="rise flex flex-wrap gap-3">
            <PrimaryCta href="/register">Get started free</PrimaryCta>
            <SecondaryCta href="https://github.com/WickTech/nimbus-ai">View source</SecondaryCta>
          </div>
        </div>
        <div style={delay(320)} className="rise min-w-0">
          <CodeFrame snippet={heroSnippet} />
        </div>
      </div>
      <BackgroundBeams />
    </section>
  );
}
