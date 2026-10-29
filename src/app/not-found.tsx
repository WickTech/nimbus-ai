import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-mono text-sm text-emerald-400">404</p>
      <h1 className="text-3xl font-bold text-white">Page not found</h1>
      <p className="max-w-sm text-zinc-400">That page doesn&apos;t exist or has moved.</p>
      <div className="flex gap-3">
        <Link href="/" className="rounded-lg border border-zinc-700 px-4 py-2 text-zinc-200 hover:bg-zinc-800">
          Home
        </Link>
        <Link href="/chat" className="rounded-lg bg-nimbus px-4 py-2 font-medium text-white hover:bg-nimbus-dark">
          Open chat
        </Link>
      </div>
    </main>
  );
}
