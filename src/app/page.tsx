import Link from "next/link";

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 text-center">
      <span className="rounded-full bg-nimbus/10 px-4 py-1 text-sm font-medium text-nimbus">
        Full-stack AI SaaS starter
      </span>
      <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
        Ship an AI product, <span className="text-nimbus">not boilerplate.</span>
      </h1>
      <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
        Nimbus is a production-shaped starter: streaming LLM chat, credential
        auth, conversation persistence, and a transactional usage-based credit
        ledger — all wired together.
      </p>
      <div className="flex gap-4">
        <Link
          href="/chat"
          className="rounded-lg bg-nimbus px-6 py-3 font-medium text-white transition hover:bg-nimbus-dark"
        >
          Open the app →
        </Link>
        <Link
          href="https://github.com/yourname/nimbus-ai"
          className="rounded-lg border border-zinc-300 px-6 py-3 font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          View source
        </Link>
      </div>
      <ul className="mt-8 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
        {[
          ["Streaming chat", "Token-by-token responses via the Vercel AI SDK."],
          ["Credit billing", "Atomic ledger; pay per 1k tokens used."],
          ["Auth + persistence", "NextAuth + Prisma store every conversation."],
        ].map(([title, body]) => (
          <li
            key={title}
            className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
