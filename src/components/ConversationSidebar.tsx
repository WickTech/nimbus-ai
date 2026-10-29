import Link from "next/link";
import { SidebarShell } from "@/components/SidebarShell";
import { NewChatLink } from "@/components/NewChatLink";
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
    <SidebarShell>
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <Link href="/" className="font-semibold text-white">
          Nimbus<span className="text-emerald-400">.</span>
        </Link>
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
          {credits} cr
        </span>
      </div>

      {/* New chat */}
      <div className="px-3 py-2">
        <NewChatLink className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800">
          <span className="text-lg leading-none">+</span>
          New chat
        </NewChatLink>
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
                      ? "bg-emerald-500/15 font-medium text-emerald-300"
                      : "text-zinc-300 hover:bg-zinc-800")
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

      <div className="border-t border-zinc-800 px-3 py-2">
        <Link
          href="/history"
          className="block rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
        >
          All chats &amp; search →
        </Link>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800 px-4 py-3">
        <Link
          href="/account"
          className="block truncate text-xs text-zinc-400 transition hover:text-zinc-100"
          title="Account settings"
        >
          {userEmail}
        </Link>
        <div className="flex items-center gap-3">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
            className="mt-1"
          >
            <button className="text-xs text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline">
              Sign out
            </button>
          </form>
          <Link
            href="/account?tab=credits"
            className="mt-1 text-xs text-emerald-400 underline-offset-2 hover:underline"
          >
            Top up credits
          </Link>
        </div>
      </div>
    </aside>
    </SidebarShell>
  );
}
