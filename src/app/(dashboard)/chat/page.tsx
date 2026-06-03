import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChatWindow } from "@/components/ChatWindow";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import type { Message } from "ai";

interface Props {
  searchParams: Promise<{ id?: string }>;
}

export default async function ChatPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id: conversationId } = await searchParams;

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { email: true, credits: true },
  });

  // Load existing messages when resuming a conversation.
  let initialMessages: Message[] = [];
  if (conversationId) {
    const convo = await db.conversation.findFirst({
      where: { id: conversationId, userId: session.user.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (convo) {
      initialMessages = convo.messages.map((m) => ({
        id: m.id,
        role: m.role as Message["role"],
        content: m.content,
      }));
    }
  }

  return (
    <div className="flex h-screen">
      <ConversationSidebar
        userId={session.user.id}
        currentId={conversationId}
        userEmail={user.email}
        credits={user.credits}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ChatWindow
          conversationId={conversationId}
          initialMessages={initialMessages}
        />
      </div>
    </div>
  );
}
