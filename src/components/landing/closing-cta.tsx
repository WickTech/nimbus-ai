import { PrimaryCta } from "./cta";

/** Last call to action before the footer. One button, the same label as the hero. */
export function ClosingCta() {
  return (
    <section aria-labelledby="closing-cta" className="pb-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="rounded-2xl bg-white/[0.04] p-1.5 ring-1 ring-white/10">
          <div className="flex flex-col items-center rounded-[10px] bg-zinc-950 bg-[radial-gradient(60%_90%_at_50%_0%,rgba(52,211,153,0.14),transparent)] px-6 py-16 text-center ring-1 ring-white/5">
            <h2 id="closing-cta" className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Try it with free credits.
            </h2>
            <p className="mt-4 max-w-md text-pretty text-zinc-400">
              Create an account, send a message, and see exactly what it cost in your credit history.
            </p>
            <PrimaryCta href="/register" className="mt-8">
              Get started free
            </PrimaryCta>
          </div>
        </div>
      </div>
    </section>
  );
}
