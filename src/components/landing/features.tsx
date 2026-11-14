import { ChatTeardropTextIcon, CoinsIcon, FingerprintIcon } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { FEATURES } from "./content";
import { ChatVisual, CreditVisual, HistoryVisual } from "./feature-visuals";

type Feature = (typeof FEATURES)[number];

/**
 * Double-bezel card (same as pricing): icon chip, title, description, then a picture of the real product.
 * `split` lays text and picture side by side on large screens (the banner card); otherwise the picture goes under the text.
 */
function FeatureCard({
  feature,
  icon,
  className,
  split = false,
  children,
}: {
  feature: Feature;
  icon: React.ReactNode;
  className?: string;
  split?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl bg-white/[0.04] p-1.5 ring-1 ring-white/10", className)}>
      <div
        className={cn(
          "flex h-full flex-col rounded-[10px] bg-zinc-950 p-6 ring-1 ring-white/5 sm:p-7",
          split && "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center lg:gap-12",
        )}
      >
        <div>
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20">
            {icon}
          </div>
          <h3 className="mt-5 text-lg font-medium text-zinc-100">{feature.title}</h3>
          <p className="mt-2 max-w-prose text-pretty leading-relaxed text-zinc-400">{feature.description}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * "What is wired together": a static bento, so there is no scroll box to get trapped in and phones see the same
 * pictures as desktops. Three features, three cells: the main one is a full-width banner, the other two share the
 * row below it. Nothing is stretched to fill space, so no card has a dead area.
 */
export function Features() {
  const [chat, credits, auth] = FEATURES;
  return (
    <section id="features" className="mx-auto max-w-5xl px-6 py-24">
      <h2 className="mb-10 text-3xl font-semibold tracking-tight">What is wired together</h2>
      <div className="grid gap-4 lg:grid-cols-5">
        <FeatureCard
          feature={chat}
          split
          icon={<ChatTeardropTextIcon size={22} weight="duotone" aria-hidden="true" />}
          className="lg:col-span-5"
        >
          <ChatVisual className="mt-8 lg:mt-0" />
        </FeatureCard>
        <FeatureCard
          feature={credits}
          icon={<CoinsIcon size={22} weight="duotone" aria-hidden="true" />}
          className="lg:col-span-3"
        >
          <CreditVisual className="mt-6" />
        </FeatureCard>
        <FeatureCard
          feature={auth}
          icon={<FingerprintIcon size={22} weight="duotone" aria-hidden="true" />}
          className="lg:col-span-2"
        >
          <HistoryVisual className="mt-6" />
        </FeatureCard>
      </div>
    </section>
  );
}
