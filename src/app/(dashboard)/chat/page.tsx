import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChatWindow } from "@/components/ChatWindow";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { email: true, credits: true },
  });

  return (
    <div className="mx-auto flex h-screen max-w-3xl flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h1 className="font-semibold">Nimbus</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="rounded-full bg-nimbus/10 px-3 py-1 font-medium text-nimbus">
            {user.credits} credits
          </span>
          <span className="text-zinc-500">{user.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="text-zinc-500 underline-offset-2 hover:underline">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <ChatWindow />
    </div>
  );
}
