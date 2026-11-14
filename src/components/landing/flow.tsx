import { ChatTeardropDotsIcon, CreditCardIcon, ReceiptIcon, UserPlusIcon } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { FLOW, type FlowIcon, type LedgerEntry } from "./content";

const ICONS: Record<FlowIcon, typeof UserPlusIcon> = {
  signup: UserPlusIcon,
  chat: ChatTeardropDotsIcon,
  bill: ReceiptIcon,
  topup: CreditCardIcon,
};

/** The ledger rows a step writes: the real `reason` strings, and which way the balance moves. */
function LedgerSlip({ entries, className }: { entries: LedgerEntry[]; className?: string }) {
  return (
    <div className={cn("rounded-lg bg-white/[0.03] px-3.5 py-3 ring-1 ring-white/10", className)}>
      {entries.map((entry, i) => (
        <div key={entry.reason} className={cn(i > 0 && "mt-3")}>
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-xs text-zinc-300">
              <span className="sr-only">Ledger entry: </span>
              {entry.reason}
            </p>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-xs font-medium",
                entry.sign === "credit" ? "bg-emerald-500/15 text-emerald-300" : "bg-white/[0.06] text-zinc-200",
              )}
            >
              {entry.sign === "credit" ? "+ credits" : "− credits"}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-zinc-400">{entry.note}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * "How a request flows": a vertical rail with an icon node per step and, beside each step, the ledger entry it
 * writes. It is a real sequence, so the numbers stay in the titles. The rail fills as you scroll through a CSS
 * scroll timeline (see .flow-fill in globals.css); browsers without one, and reduced-motion users, see it fully drawn.
 */
export function Flow() {
  return (
    <section id="flow" className="mx-auto max-w-5xl px-6 py-24">
      <h2 className="mb-12 text-3xl font-semibold tracking-tight">How a request flows</h2>
      <div>
        <ol className="relative">
          {FLOW.map((step, index) => {
            const Icon = ICONS[step.icon];
            return (
              <li
                key={step.title}
                className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 pb-12 last:pb-0 sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-x-6 lg:grid-cols-[3rem_minmax(0,1fr)_17rem] lg:gap-x-10"
              >
                {index < FLOW.length - 1 && (
                  <>
                    {/* The rail: a track and an emerald fill from this node down to the next one. The fill grows as
                        this stretch scrolls into view (.flow-fill); left: is used because the animation owns transform. */}
                    <span aria-hidden className="absolute bottom-0 left-[19.5px] top-10 w-px bg-white/10 sm:left-[23.5px] sm:top-12" />
                    <span
                      aria-hidden
                      className="flow-fill absolute bottom-0 left-[19.5px] top-10 w-px origin-top bg-gradient-to-b from-emerald-300 to-emerald-600 sm:left-[23.5px] sm:top-12"
                    />
                  </>
                )}
                <span className="col-start-1 row-start-1 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-950 text-emerald-300 ring-1 ring-emerald-400/30 sm:h-12 sm:w-12">
                  <Icon size={20} weight="duotone" aria-hidden="true" />
                </span>
                <div className="col-start-2 row-start-1">
                  <h3 className="pt-1.5 text-xl font-semibold text-emerald-300 sm:pt-2.5">{step.title}</h3>
                  <p className="mt-2 max-w-prose leading-relaxed text-zinc-400">{step.body}</p>
                </div>
                <LedgerSlip
                  entries={step.entries}
                  className="col-start-2 row-start-2 mt-4 lg:col-start-3 lg:row-start-1 lg:mt-1.5"
                />
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
