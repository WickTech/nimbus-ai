"use client";

import { useChat, type Message } from "ai/react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

interface Props {
  conversationId?: string;
  initialMessages?: Message[];
}

export function ChatWindow({ conversationId, initialMessages }: Props) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      api: "/api/chat",
      initialMessages,
      body: { conversationId },
    });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="mt-20 text-center text-zinc-500 dark:text-zinc-400">
            Ask Nimbus anything to get started.
          </p>
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
                  : "bg-zinc-100 dark:bg-zinc-800")
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
                        <code className="block overflow-x-auto rounded bg-zinc-200 p-2 font-mono text-xs dark:bg-zinc-700">
                          {children}
                        </code>
                      ) : (
                        <code className="rounded bg-zinc-200 px-1 font-mono text-xs dark:bg-zinc-700">
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
            </div>
          </div>
        ))}
        {error && (
          <p className="text-center text-sm text-red-500">
            {/* The 402 reply body is {"error":"Out of credits. ..."}; the SDK puts that text in error.message. */}
            {/out of credits/i.test(error.message)
              ? "You're out of credits."
              : "Something went wrong. Try again."}
          </p>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800"
      >
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Message Nimbus…"
          className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 outline-none focus:border-nimbus dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="rounded-lg bg-nimbus px-5 py-2 font-medium text-white transition hover:bg-nimbus-dark disabled:opacity-50"
        >
          {isLoading ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
