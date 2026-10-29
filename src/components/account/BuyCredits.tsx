"use client";

import { useState } from "react";

type Pack = { priceId: string; credits: number; label: string };

/** Pack picker. The packs come from the server: price ids live in server-only env vars. */
export function BuyCredits({ packs }: { packs: Pack[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(priceId: string) {
    setBusy(priceId);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("Could not start checkout. Please try again.");
    } catch {
      setError("Network error. Check your connection and try again.");
    }
    setBusy(null);
  }

  if (packs.length === 0) {
    return <p className="text-sm text-zinc-400">Buying credits is not configured on this deployment.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid gap-3 sm:grid-cols-3">
        {packs.map((p) => (
          <li key={p.priceId} className="flex flex-col justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <span className="font-medium text-zinc-100">{p.label}</span>
            <button
              onClick={() => buy(p.priceId)}
              disabled={busy !== null}
              className="rounded-lg bg-nimbus px-3 py-2 text-sm font-medium text-white transition hover:bg-nimbus-dark disabled:opacity-60"
            >
              {busy === p.priceId ? "Opening checkout…" : "Buy"}
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
