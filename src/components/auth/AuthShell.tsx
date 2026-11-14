import Link from "next/link";
import { HeroGlow } from "@/components/landing/hero-glow";

/** Shared frame for sign in / sign up: the same full-screen emerald glow as the landing page, logo, and a card. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12">
      <HeroGlow />
      <div className="relative z-10 flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="self-center text-lg font-semibold tracking-tight text-white">
          Nimbus<span className="text-emerald-400">.</span>
        </Link>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
          <div className="mt-6 flex flex-col gap-5">{children}</div>
        </div>
        {/* zinc-300, not 400: this line sits directly on the glow (see landing/glow.ts). */}
        {footer && <p className="text-center text-sm text-zinc-300">{footer}</p>}
      </div>
    </main>
  );
}
