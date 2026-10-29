"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Field, inputClass } from "@/components/auth/Field";
import { PasswordInput } from "@/components/auth/PasswordInput";

export function DeleteAccount({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmEmail: data.get("confirmEmail"), password: data.get("password") || undefined }),
      });
      if (res.ok) {
        // The session cookie outlives the user row; sign out so it does not point at nothing.
        await signOut({ redirectTo: "/" });
        return;
      }
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "Could not delete the account.");
    } catch {
      setError("Network error. Check your connection and try again.");
    }
    setDeleting(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4 rounded-xl border border-red-900/60 bg-red-950/20 p-5">
      <div>
        <h3 className="font-semibold text-red-300">Delete account</h3>
        <p className="mt-1 text-sm text-zinc-400">
          This permanently deletes your account, conversations and credit history. Unused credits are lost and cannot be refunded here.
        </p>
      </div>
      <Field id="confirmEmail" label={`Type ${email} to confirm`}>
        <input id="confirmEmail" name="confirmEmail" required autoComplete="off" placeholder="Your email" className={inputClass()} />
      </Field>
      {hasPassword && (
        <Field id="deletePassword" label="Password">
          <PasswordInput id="deletePassword" name="password" required autoComplete="current-password" placeholder="Password" />
        </Field>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <button disabled={deleting} className="self-start rounded-lg bg-red-700 px-4 py-2 font-medium text-white transition hover:bg-red-600 disabled:opacity-60">
        {deleting ? "Deleting…" : "Delete my account"}
      </button>
    </form>
  );
}
