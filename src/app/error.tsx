"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-bold text-white">Something went wrong</h1>
      <p className="max-w-sm text-zinc-400">An unexpected error occurred. Your data is safe; try again.</p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-nimbus px-4 py-2 font-medium text-white hover:bg-nimbus-dark"
        >
          Try again
        </button>
        <Link href="/" className="rounded-lg border border-zinc-700 px-4 py-2 text-zinc-200 hover:bg-zinc-800">
          Home
        </Link>
      </div>
    </main>
  );
}
