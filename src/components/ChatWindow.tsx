"use client";

import { useChat } from "ai/react";

export function ChatWindow() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({ api: "/api/chat" });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="mt-20 text-center text-zinc-400">
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
                "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm " +
                (m.role === "user"
                  ? "bg-nimbus text-white"
                  : "bg-zinc-100 dark:bg-zinc-800")
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {error && (
          <p className="text-center text-sm text-red-500">
            {error.message.includes("402")
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
