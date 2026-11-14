"use client";

import Link from "next/link";
import { useRef } from "react";

type NavLink = { href: string; label: string };

/**
 * Menu for screens under 768 px, where the anchor links would otherwise be unreachable. It is a native
 * <details>, so it works without JavaScript; the script only closes it after a link is chosen or Escape is pressed.
 */
export function MobileMenu({ links, showSignIn }: { links: NavLink[]; showSignIn: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const close = () => ref.current?.removeAttribute("open");

  return (
    <details
      ref={ref}
      className="group relative md:hidden"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          close();
          ref.current?.querySelector("summary")?.focus();
        }
      }}
    >
      <summary className="flex cursor-pointer list-none items-center rounded-lg px-3 py-2 text-sm font-medium text-zinc-200 transition hover:text-white [&::-webkit-details-marker]:hidden">
        Menu
      </summary>
      <ul className="absolute right-0 mt-2 w-52 rounded-xl bg-zinc-900 p-2 text-sm ring-1 ring-white/10">
        {links.map((l) => (
          <li key={l.href}>
            <a href={l.href} onClick={close} className="block rounded-lg px-3 py-2 text-zinc-200 hover:bg-zinc-800">
              {l.label}
            </a>
          </li>
        ))}
        {showSignIn && (
          <li>
            <Link href="/login" className="block rounded-lg px-3 py-2 text-zinc-200 hover:bg-zinc-800">
              Sign in
            </Link>
          </li>
        )}
      </ul>
    </details>
  );
}
