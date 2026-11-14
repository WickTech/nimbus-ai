import { cn } from "@/lib/utils";
import { tokenize, type TokenKind } from "./code-tokens";
import type { Snippet } from "./snippets";

// One accent only: keywords take the emerald, everything else stays in the zinc scale.
// zinc-400 on zinc-950 is about 7.6:1, so even comments pass WCAG AA.
const KIND_CLASS: Record<TokenKind, string> = {
  plain: "",
  keyword: "text-emerald-300",
  string: "text-zinc-300",
  comment: "italic text-zinc-400",
};

/**
 * A code excerpt in a frame. `bezel` nests the panel in a hairline-ringed tray (hero); `bare` drops the tray
 * for places that already draw their own border, like the sticky feature panel.
 */
export function CodeFrame({
  snippet,
  variant = "bezel",
  className,
}: {
  snippet: Snippet;
  variant?: "bezel" | "bare";
  className?: string;
}) {
  const panel = (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden bg-zinc-950",
        variant === "bezel" ? "rounded-[10px] ring-1 ring-white/5" : "rounded-[15px]",
      )}
    >
      <figcaption className="border-b border-white/5 px-4 py-2.5 font-mono text-xs text-zinc-400">
        {snippet.file} (condensed)
      </figcaption>
      {/* Focusable so keyboard users can scroll a long line on narrow screens. */}
      <pre
        tabIndex={0}
        className={cn(
          "flex-1 overflow-x-auto px-4 font-mono text-zinc-200",
          // The hero excerpt gets room to breathe; the sticky feature panel has a fixed height, so it is denser.
          variant === "bezel" ? "py-4 text-[12.5px] leading-6" : "py-3 text-[12px] leading-5",
        )}
      >
        <code>
          {tokenize(snippet.code, snippet.lang).map((t, i) =>
            t.kind === "plain" ? (
              t.text
            ) : (
              <span key={i} className={KIND_CLASS[t.kind]}>
                {t.text}
              </span>
            ),
          )}
        </code>
      </pre>
    </div>
  );

  if (variant === "bare") return <figure className={cn("h-full", className)}>{panel}</figure>;
  return (
    <figure className={cn("rounded-2xl bg-white/[0.04] p-1.5 ring-1 ring-white/10", className)}>{panel}</figure>
  );
}
