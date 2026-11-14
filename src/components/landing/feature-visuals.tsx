import { ChatTeardropTextIcon, EqualsIcon, LockKeyIcon } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { CHAT_SAMPLE, HISTORY_SAMPLE, PACKS } from "./content";

/**
 * Small, static pictures of the real product, one per feature. They are decoration (`aria-hidden`, nothing
 * focusable), so the cards read the same without them. All text is zinc-400 or lighter: zinc-500 fails on these surfaces.
 */
const SURFACE = "rounded-lg bg-zinc-900/60 p-4 ring-1 ring-white/5";

/** Miniature of the chat. Bubble colors are copied from src/components/ChatWindow.tsx. */
export function ChatVisual({ className }: { className?: string }) {
  return (
    <div data-feature-visual aria-hidden="true" className={cn(SURFACE, "flex flex-col justify-end", className)}>
      <div className="flex flex-col gap-3">
        {CHAT_SAMPLE.messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={cn(
                "max-w-[88%] rounded-2xl px-4 py-2 text-sm",
                m.role === "user" ? "bg-nimbus text-white" : "bg-zinc-800 text-zinc-100",
              )}
            >
              {m.text}
              {i === CHAT_SAMPLE.messages.length - 1 && (
                <span className="caret ml-1 inline-block h-4 w-[7px] translate-y-0.5 bg-emerald-400" />
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
        <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-300 ring-1 ring-emerald-400/20">
          Streaming
        </span>
        <span className="font-mono tabular-nums">{CHAT_SAMPLE.tokensLabel}</span>
      </div>
    </div>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 rounded-md bg-zinc-950 px-3 py-2.5 ring-1 ring-white/5">
      <p className="text-lg font-semibold tabular-nums text-white">{value}</p>
      <p className="text-xs text-zinc-400">{label}</p>
    </div>
  );
}

/** The pricing rule and the three packs that are actually for sale. */
export function CreditVisual({ className }: { className?: string }) {
  return (
    <div data-feature-visual aria-hidden="true" className={cn(SURFACE, className)}>
      <div className="flex items-center gap-3">
        <Tile value="1" label="credit" />
        <EqualsIcon size={16} className="shrink-0 text-zinc-400" />
        <Tile value="~1,000" label="tokens" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {PACKS.map((p) => (
          <div
            key={p.credits}
            className={cn(
              "rounded-md px-3 py-2.5 text-center ring-1",
              p.best ? "bg-emerald-500/10 ring-emerald-400/30" : "bg-zinc-950 ring-white/5",
            )}
          >
            <p className="text-base font-semibold tabular-nums text-white">{p.credits.toLocaleString("en-US")}</p>
            <p className="text-xs text-zinc-400">${p.dollars}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryGroup({ label, items }: { label: string; items: { title: string; active: boolean }[] }) {
  return (
    <div>
      <p className="px-2.5 text-xs font-medium text-zinc-400">{label}</p>
      <ul className="mt-1 flex flex-col gap-0.5">
        {items.map((c) => (
          <li
            key={c.title}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-zinc-200",
              c.active && "bg-white/[0.06]",
            )}
          >
            <ChatTeardropTextIcon size={16} className="shrink-0 text-zinc-400" />
            {c.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Miniature of the saved-conversation sidebar, plus the one security fact worth stating. */
export function HistoryVisual({ className }: { className?: string }) {
  return (
    <div data-feature-visual aria-hidden="true" className={cn(SURFACE, className)}>
      <div className="flex flex-col gap-3">
        <HistoryGroup label="Today" items={HISTORY_SAMPLE.today} />
        <HistoryGroup label="Yesterday" items={HISTORY_SAMPLE.yesterday} />
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
        <LockKeyIcon size={14} className="shrink-0" />
        {HISTORY_SAMPLE.note}
      </p>
    </div>
  );
}
