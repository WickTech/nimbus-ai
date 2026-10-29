"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export const NEW_CHAT_EVENT = "nimbus:new-chat";

/**
 * "New chat". From a saved conversation it navigates to /chat. From a chat that is already on /chat it cannot
 * navigate (same URL, so the chat window would keep its messages and conversation id); it asks the window to reset.
 */
export function NewChatLink({ className, children }: { className?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const onBlankChat = pathname === "/chat" && !params.get("id");

  return (
    <Link
      href="/chat"
      className={className}
      onClick={(e) => {
        if (!onBlankChat) return;
        e.preventDefault();
        window.dispatchEvent(new Event(NEW_CHAT_EVENT));
      }}
    >
      {children}
    </Link>
  );
}
