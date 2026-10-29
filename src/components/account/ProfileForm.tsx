"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClass } from "@/components/auth/Field";

export function ProfileForm({ initialName, email }: { initialName: string; email: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    const name = String(new FormData(e.currentTarget).get("name") ?? "");
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setStatus({ kind: "ok", text: "Profile saved." });
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus({ kind: "error", text: typeof data.error === "string" ? data.error : "Could not save. Try again." });
      }
    } catch {
      setStatus({ kind: "error", text: "Network error. Check your connection and try again." });
    }
    setSaving(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <Field id="account-email" label="Email">
        <input id="account-email" value={email} readOnly className={inputClass() + " cursor-not-allowed text-zinc-400"} />
      </Field>
      <Field id="account-name" label="Name">
        <input
          id="account-name"
          name="name"
          defaultValue={initialName}
          maxLength={80}
          autoComplete="name"
          placeholder="Your name"
          className={inputClass()}
        />
      </Field>
      {status && (
        <p role={status.kind === "error" ? "alert" : "status"} className={status.kind === "ok" ? "text-sm text-emerald-400" : "text-sm text-red-400"}>
          {status.text}
        </p>
      )}
      <button disabled={saving} className="self-start rounded-lg bg-nimbus px-4 py-2 font-medium text-white transition hover:bg-nimbus-dark disabled:opacity-60">
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
