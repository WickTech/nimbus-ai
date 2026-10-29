"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useChat, type Message } from "ai/react";
import { NEW_CHAT_EVENT } from "@/components/NewChatLink";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

interface Props {
  conversationId?: string;
  initialMessages?: Message[];
  credits: number;
}

const SUGGESTIONS = [
  "Explain how JWT sessions work",
  "Write a SQL query to find duplicate emails",
  "Summarise the pros and cons of SQLite vs Postgres",
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked: leave the label unchanged */
        }
      }}
      className="mt-1 text-xs text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function ChatWindow({ conversationId, initialMessages, credits }: Props) {
  const router = useRouter();
  // A new chat gets its id from the server on the first reply. Remembering it keeps every follow-up in the
  // same conversation instead of starting a new one each time.
  const [activeId, setActiveId] = useState(conversationId);
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, setMessages, setInput, stop } =
    useChat({
      api: "/api/chat",
      initialMessages,
      body: { conversationId: activeId },
      onResponse(response) {
        const id = response.headers.get("x-conversation-id");
        if (id) setActiveId(id);
      },
      // Refresh the server-rendered sidebar (new chat, ordering, credit balance).
      onFinish() {
        router.refresh();
      },
    });

  // Follow new output unless the user scrolled up to read.
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const outOfCredits = credits <= 0;

  // "New chat" while already on a blank /chat: start over in place.
  useEffect(() => {
    const reset = () => {
      stop();
      setMessages([]);
      setInput("");
      setActiveId(undefined);
    };
    window.addEventListener(NEW_CHAT_EVENT, reset);
    return () => window.removeEventListener(NEW_CHAT_EVENT, reset);
  }, [stop, setMessages, setInput]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {(outOfCredits || credits <= 3) && (
        <div
          role="status"
          className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 pl-16 text-sm text-amber-200 md:pl-4"
        >
          {outOfCredits ? "You're out of credits." : `Only ${credits} credit${credits === 1 ? "" : "s"} left.`}{" "}
          <Link href="/account?tab=credits" className="font-medium underline">
            Top up
          </Link>
        </div>
      )}
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 space-y-4 overflow-y-auto p-4 pt-16 md:pt-4"
      >
        {messages.length === 0 && (
          <div className="mx-auto mt-16 max-w-md text-center">
            <h2 className="text-xl font-semibold text-white">What can Nimbus help with?</h2>
            <p className="mt-1 text-sm text-zinc-400">Each reply uses one credit.</p>
            <div className="mt-5 flex flex-col gap-2">
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setInput(q)}
                  className="rounded-lg border border-zinc-800 px-4 py-2 text-left text-sm text-zinc-300 transition hover:border-emerald-500/50 hover:bg-zinc-900"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user" ? "flex justify-end" : "flex justify-start"
            }
          >
            <div
              className={
                "max-w-[80%] rounded-2xl px-4 py-2 text-sm " +
                (m.role === "user"
                  ? "bg-nimbus text-white"
                  : "bg-zinc-800 text-zinc-100")
              }
            >
              {m.role === "user" ? (
                <span className="whitespace-pre-wrap">{m.content}</span>
              ) : (
                <ReactMarkdown
                  rehypePlugins={[rehypeSanitize]}
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="mb-2 ml-4 list-disc">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal">{children}</ol>,
                    li: ({ children }) => <li className="mb-0.5">{children}</li>,
                    code: ({ children, className }) =>
                      className ? (
                        <code className="block overflow-x-auto rounded bg-zinc-950 p-2 font-mono text-xs">
                          {children}
                        </code>
                      ) : (
                        <code className="rounded bg-zinc-950 px-1 font-mono text-xs">
                          {children}
                        </code>
                      ),
                    pre: ({ children }) => <pre className="mb-2">{children}</pre>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              )}
              {m.role === "assistant" && m.content && !(isLoading && m.id === messages[messages.length - 1]?.id) && (
                <CopyButton text={m.content} />
              )}
            </div>
          </div>
        ))}
        {error && (
          <p className="text-center text-sm text-red-400">
            {/* The 402 reply body is {"error":"Out of credits. ..."}; the SDK puts that text in error.message. */}
            {/out of credits/i.test(error.message)
              ? "You're out of credits."
              : /too many messages/i.test(error.message)
                ? "You're sending messages too fast. Wait a moment."
                : "Something went wrong. Try again."}
          </p>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-zinc-800 p-4"
      >
        <input
          value={input}
          onChange={handleInputChange}
          placeholder={outOfCredits ? "Top up credits to continue" : "Message Nimbus…"}
          aria-label="Message"
          disabled={outOfCredits}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-emerald-500"
        />
        {isLoading ? (
          <button
            type="button"
            onClick={() => stop()}
            className="rounded-lg border border-zinc-600 px-5 py-2 font-medium text-zinc-100 transition hover:bg-zinc-800"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={outOfCredits || !input.trim()}
            className="rounded-lg bg-nimbus px-5 py-2 font-medium text-white transition hover:bg-nimbus-dark disabled:opacity-50"
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
}
