import Link from "next/link";
import { cn } from "@/lib/utils";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 font-medium sm:px-6 transition duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]";

/** Filled emerald button. White on emerald-700 is 5.5:1. The arrow nudges right on hover. */
export function PrimaryCta({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("group bg-emerald-700 text-white hover:bg-emerald-600", BASE, className)}>
      {children}
      <span aria-hidden className="transition duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
        →
      </span>
    </Link>
  );
}

/** Outlined button for the second action next to a primary one. */
export function SecondaryCta({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("border border-zinc-700 text-zinc-100 hover:bg-zinc-900", BASE, className)}
    >
      {children}
    </Link>
  );
}
