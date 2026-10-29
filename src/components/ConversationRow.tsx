"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { inputClass } from "@/components/auth/Field";

type Props = { id: string; title: string; when: string; messages: number };

/** One history entry: open it, rename it in place, or delete it (with a confirm step). */
export function ConversationRow({ id, title, when, messages }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "rename" | "confirm">("view");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(init: RequestInit): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/conversations/${id}`, { ...init, headers: { "content-type": "application/json" } });
      if (res.ok) return true;
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "Something went wrong. Try again.");
    } catch {
      setError("Network error. Check your connection and try again.");
    }
    setBusy(false);
    return false;
  }

  async function rename(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = String(new FormData(e.currentTarget).get("title") ?? "");
    if (await call({ method: "PATCH", body: JSON.stringify({ title: next }) })) {
      setMode("view");
      setBusy(false);
      router.refresh();
    }
  }

  async function remove() {
    if (await call({ method: "DELETE" })) router.refresh();
  }

  const actionClass = "rounded px-2 py-1 text-xs text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50";

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      {mode === "rename" ? (
        <form onSubmit={rename} className="flex flex-wrap items-center gap-2">
          <label htmlFor={`title-${id}`} className="sr-only">
            Chat name
          </label>
          <input id={`title-${id}`} name="title" defaultValue={title} maxLength={100} required autoFocus className={inputClass() + " flex-1"} />
          <button disabled={busy} className="rounded-lg bg-nimbus px-3 py-2 text-sm font-medium text-white hover:bg-nimbus-dark disabled:opacity-60">
            Save
          </button>
          <button type="button" onClick={() => setMode("view")} className={actionClass}>
            Cancel
          </button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/chat?id=${id}`} className="block truncate font-medium text-zinc-100 hover:text-emerald-300" title={title}>
              {title}
            </Link>
            <p className="text-xs text-zinc-400">
              {when} · {messages} {messages === 1 ? "message" : "messages"}
            </p>
          </div>
          {mode === "confirm" ? (
            <div className="flex items-center gap-1" role="group" aria-label={`Delete ${title}?`}>
              <span className="text-xs text-zinc-300">Delete this chat?</span>
              <button onClick={remove} disabled={busy} className="rounded bg-red-700 px-2 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-60">
                Yes, delete
              </button>
              <button onClick={() => setMode("view")} className={actionClass}>
                Keep
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button onClick={() => setMode("rename")} className={actionClass} aria-label={`Rename ${title}`}>
                Rename
              </button>
              <button onClick={() => setMode("confirm")} className={actionClass} aria-label={`Delete ${title}`}>
                Delete
              </button>
            </div>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </li>
  );
}
