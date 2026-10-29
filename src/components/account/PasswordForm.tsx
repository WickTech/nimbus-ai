"use client";

import { useState } from "react";
import { Field } from "@/components/auth/Field";
import { PasswordInput } from "@/components/auth/PasswordInput";

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const newPassword = String(data.get("newPassword") ?? "");

    if (newPassword !== data.get("confirm")) {
      setStatus({ kind: "error", text: "Passwords do not match." });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: data.get("currentPassword") || undefined, newPassword }),
      });
      if (res.ok) {
        form.reset();
        setStatus({ kind: "ok", text: "Password updated." });
      } else {
        const body = await res.json().catch(() => ({}));
        setStatus({ kind: "error", text: typeof body.error === "string" ? body.error : "Could not update the password." });
      }
    } catch {
      setStatus({ kind: "error", text: "Network error. Check your connection and try again." });
    }
    setSaving(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      {!hasPassword && (
        <p className="text-sm text-zinc-400">
          You signed in with a provider, so this account has no password yet. Set one to also sign in with your email.
        </p>
      )}
      {hasPassword && (
        <Field id="currentPassword" label="Current password">
          <PasswordInput id="currentPassword" name="currentPassword" required autoComplete="current-password" placeholder="Current password" />
        </Field>
      )}
      <Field id="newPassword" label="New password">
        <PasswordInput id="newPassword" name="newPassword" required minLength={8} maxLength={128} autoComplete="new-password" placeholder="New password (min 8 chars)" />
      </Field>
      <Field id="confirm" label="Confirm new password">
        <PasswordInput id="confirm" name="confirm" required autoComplete="new-password" placeholder="Confirm new password" />
      </Field>
      {status && (
        <p role={status.kind === "error" ? "alert" : "status"} className={status.kind === "ok" ? "text-sm text-emerald-400" : "text-sm text-red-400"}>
          {status.text}
        </p>
      )}
      <button disabled={saving} className="self-start rounded-lg bg-nimbus px-4 py-2 font-medium text-white transition hover:bg-nimbus-dark disabled:opacity-60">
        {saving ? "Updating…" : hasPassword ? "Change password" : "Set password"}
      </button>
    </form>
  );
}
