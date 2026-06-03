import Link from "next/link";
import { db } from "@/lib/db";
import { signOut } from "@/lib/auth";

interface Props {
  userId: string;
  currentId?: string;
  userEmail: string;
  credits: number;
}

export async function ConversationSidebar({ userId, currentId, userEmail, credits }: Props) {
  const conversations = await db.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, title: true, updatedAt: true },
  });

  return (
    <aside className="flex w-64 flex-shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <span className="font-semibold">Nimbus</span>
        <span className="rounded-full bg-nimbus/10 px-2 py-0.5 text-xs font-medium text-nimbus">
          {credits} cr
        </span>
      </div>

      {/* New chat */}
      <div className="px-3 py-2">
        <Link
          href="/chat"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <span className="text-lg leading-none">+</span>
          New chat
        </Link>
      </div>

      {/* Conversation list */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        {conversations.length === 0 ? (
          <p className="px-3 py-4 text-xs text-zinc-400">No conversations yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/chat?id=${c.id}`}
                  className={
                    "block truncate rounded-lg px-3 py-2 text-sm transition " +
                    (c.id === currentId
                      ? "bg-nimbus/10 font-medium text-nimbus"
                      : "text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800")
                  }
                  title={c.title}
                >
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <p className="truncate text-xs text-zinc-500" title={userEmail}>
          {userEmail}
        </p>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
          className="mt-1"
        >
          <button className="text-xs text-zinc-400 underline-offset-2 hover:underline">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
