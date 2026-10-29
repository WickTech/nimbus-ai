"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Fixed sidebar on desktop; slide-in drawer with a menu button on small screens. */
export function SidebarShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-30 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 md:hidden"
      >
        <span aria-hidden>☰</span>
      </button>
      {open && (
        <div
          aria-hidden
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}
      <div
        // Any link tapped inside the drawer closes it.
        onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
        className={
          "fixed inset-y-0 left-0 z-50 w-64 transition-transform md:static md:z-auto md:translate-x-0 " +
          (open ? "translate-x-0" : "-translate-x-full")
        }
      >
        {children}
      </div>
    </>
  );
}
