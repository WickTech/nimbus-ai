import Link from "next/link";

/** Short footer. No legal links: the project has no policy pages, and a dead link is worse than none. */
export function Footer() {
  return (
    <footer className="border-t border-white/5 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/" className="text-lg font-semibold tracking-tight text-white">
            Nimbus<span className="text-emerald-400">.</span>
          </Link>
          <p className="mt-2 max-w-sm text-sm text-zinc-400">
            An open-source AI SaaS starter, built with Next.js, Prisma and the Vercel AI SDK.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex gap-6 text-sm text-zinc-300">
            <li>
              <a
                href="https://github.com/WickTech/nimbus-ai"
                rel="noopener noreferrer"
                className="transition hover:text-white"
              >
                GitHub
              </a>
            </li>
            <li>
              <Link href="/login" className="transition hover:text-white">
                Sign in
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-5xl px-6 text-xs text-zinc-400">
        MIT licensed. © {new Date().getFullYear()} Rishabh Verma.
      </p>
    </footer>
  );
}
