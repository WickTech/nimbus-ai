import Link from "next/link";
import { Spotlight } from "@/components/ui/spotlight";

/** Shared frame for sign in / sign up: spotlight backdrop, logo, and a card. */
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
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12">
      <Spotlight className="-top-40 left-0 overflow-visible md:-top-20 md:left-60" fill="#34d399" />
      <div className="relative z-10 flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="self-center text-lg font-semibold tracking-tight text-white">
          Nimbus<span className="text-emerald-400">.</span>
        </Link>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
          <div className="mt-6 flex flex-col gap-5">{children}</div>
        </div>
        {footer && <p className="text-center text-sm text-zinc-400">{footer}</p>}
      </div>
    </main>
  );
}
