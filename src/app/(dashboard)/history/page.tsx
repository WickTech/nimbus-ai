import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { groupByBucket, searchWhere } from "@/lib/history";
import { ConversationRow } from "@/components/ConversationRow";

export const metadata = { title: "Chat history — Nimbus AI" };

const PAGE_SIZE = 30;

const when = (d: Date) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(d) + " UTC";

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ q?: string; cursor?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { q = "", cursor } = await searchParams;
  const query = q.trim().slice(0, 100);

  const rows = await db.conversation.findMany({
    where: { userId, ...searchWhere(query) },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, title: true, updatedAt: true, _count: { select: { messages: true } } },
  });
  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const groups = groupByBucket(page, new Date());
  const next = hasMore ? page[page.length - 1].id : null;

  const nextHref = next ? `/history?${new URLSearchParams({ ...(query ? { q: query } : {}), cursor: next })}` : null;

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold text-white">
            Nimbus<span className="text-emerald-400">.</span>
          </Link>
          <Link href="/chat" className="text-sm text-zinc-300 transition hover:text-white">
            ← Back to chat
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold text-white">Chat history</h1>
        <p className="mt-1 text-sm text-zinc-400">Every conversation you have had, newest first.</p>

        <form action="/history" role="search" className="mt-6 flex gap-2">
          <label htmlFor="q" className="sr-only">
            Search your chats
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            maxLength={100}
            placeholder="Search titles and messages"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-emerald-500"
          />
          <button className="rounded-lg bg-nimbus px-4 py-2 font-medium text-white transition hover:bg-nimbus-dark">Search</button>
        </form>

        {query && (
          <p className="mt-3 text-sm text-zinc-400">
            Results for “{query}”.{" "}
            <Link href="/history" className="text-emerald-400 underline underline-offset-2">
              Clear search
            </Link>
          </p>
        )}

        {groups.length === 0 ? (
          <p className="mt-10 text-center text-zinc-400">
            {query ? "No chats match that search." : "No conversations yet. Start one and it will show up here."}
          </p>
        ) : (
          <div className="mt-8 flex flex-col gap-8">
            {groups.map((g) => (
              <section key={g.label} aria-labelledby={`g-${g.label}`}>
                <h2 id={`g-${g.label}`} className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  {g.label}
                </h2>
                <ul className="flex flex-col gap-2">
                  {g.items.map((c) => (
                    <ConversationRow key={c.id} id={c.id} title={c.title} when={when(c.updatedAt)} messages={c._count.messages} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {nextHref && (
          <div className="mt-8 text-center">
            <Link href={nextHref} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-800">
              Load older chats
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
