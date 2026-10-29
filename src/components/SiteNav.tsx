import Link from "next/link";
import { auth } from "@/lib/auth";

const links = [
  { href: "#features", label: "Features" },
  { href: "#flow", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
];

/** Top bar for the marketing page: anchors, plus Sign in / Get started (or Open app when signed in). */
export async function SiteNav() {
  const signedIn = !!(await auth())?.user;

  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          Nimbus<span className="text-emerald-400">.</span>
        </Link>
        <ul className="hidden items-center gap-6 text-sm text-zinc-300 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="transition hover:text-white">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 text-sm">
          {signedIn ? (
            <Link href="/chat" className="rounded-lg bg-nimbus px-4 py-2 font-medium text-white transition hover:bg-nimbus-dark">
              Open app
            </Link>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-2 font-medium text-zinc-200 transition hover:text-white">
                Sign in
              </Link>
              <Link href="/register" className="rounded-lg bg-nimbus px-4 py-2 font-medium text-white transition hover:bg-nimbus-dark">
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
