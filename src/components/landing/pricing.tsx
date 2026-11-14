import Link from "next/link";
import { cn } from "@/lib/utils";
import { PACKS } from "./content";

const cents = (dollars: number, credits: number) => `${((dollars * 100) / credits).toFixed(1)}¢`;

export function Pricing() {
  return (
    <ul className="mt-10 grid gap-4 md:grid-cols-3">
      {PACKS.map((p) => (
        <li
          key={p.credits}
          className={cn(
            "rounded-2xl p-1.5 ring-1",
            p.best ? "bg-emerald-500/10 ring-emerald-400/40" : "bg-white/[0.04] ring-white/10",
          )}
        >
          <div className="flex h-full flex-col rounded-[10px] bg-zinc-950 p-6 ring-1 ring-white/5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-base font-medium text-zinc-100">{p.credits.toLocaleString("en-US")} credits</h3>
              {p.best && <span className="text-sm text-emerald-300">Best price</span>}
            </div>
            <p className="mt-6 text-5xl font-semibold tracking-tight text-white">${p.dollars}</p>
            <p className="mt-1 text-sm tabular-nums text-zinc-400">{cents(p.dollars, p.credits)} per credit</p>
            <p className="mt-6 text-pretty text-sm leading-relaxed text-zinc-400">{p.blurb}</p>
            {/* mt-auto pins the button to the bottom, so the three line up whatever the blurb length; pt-8 keeps the gap. */}
            <div className="mt-auto pt-8">
              <Link
                href={`/register?pack=${p.credits}`}
                className={cn(
                  "flex items-center justify-center rounded-lg px-5 py-3 text-sm font-medium transition duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
                  p.best
                    ? "bg-emerald-700 text-white hover:bg-emerald-600"
                    : "border border-zinc-700 text-zinc-100 hover:bg-zinc-900",
                )}
              >
                Get {p.credits.toLocaleString("en-US")} credits
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
