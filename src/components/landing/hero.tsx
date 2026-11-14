import type { CSSProperties } from "react";
import { PrimaryCta, SecondaryCta } from "./cta";
import { HERO_LEDE } from "./content";

// One page-load sequence (see .rise in globals.css): four steps, 80 ms apart, position only. It plays only when
// the visitor has not asked for reduced motion.
const delay = (ms: number): CSSProperties => ({ "--rise-delay": `${ms}ms` }) as CSSProperties;

/** Centred hero text. The page wrapper owns the glow behind it and the full-screen height. */
export function Hero() {
  return (
    <section className="relative flex flex-1 items-center px-6 pb-16 pt-28 sm:pt-32">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-7 text-center">
        <span
          style={delay(0)}
          className="rise rounded-full bg-emerald-500/15 px-4 py-1 text-sm font-medium text-emerald-300"
        >
          Full-stack AI SaaS starter
        </span>
        <h1
          style={delay(80)}
          className="rise text-balance text-4xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl lg:leading-[1.02]"
        >
          Ship an AI product, <span className="text-emerald-400">not boilerplate.</span>
        </h1>
        {/* zinc-300, not 400: this text sits on the glow (see glow.ts). */}
        <p style={delay(160)} className="rise mx-auto max-w-2xl text-pretty text-lg leading-relaxed text-zinc-300">
          {HERO_LEDE}
        </p>
        <div style={delay(240)} className="rise flex flex-wrap justify-center gap-3">
          <PrimaryCta href="/register">Get started free</PrimaryCta>
          <SecondaryCta href="https://github.com/WickTech/nimbus-ai">View source</SecondaryCta>
        </div>
      </div>
    </section>
  );
}
