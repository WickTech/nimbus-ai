"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field, inputClass } from "@/components/auth/Field";
import { PasswordInput } from "@/components/auth/PasswordInput";

type Errors = Partial<Record<"name" | "email" | "password" | "confirm" | "form", string>>;

/** Turns the API's error body (a string, or zod's flatten() output) into per-field messages. */
function apiErrors(body: unknown): Errors {
  const error = (body as { error?: unknown })?.error;
  if (typeof error === "string") return error.toLowerCase().includes("email") ? { email: error } : { form: error };
  const fields = (error as { fieldErrors?: Record<string, string[]> })?.fieldErrors;
  if (fields) {
    const out: Errors = {};
    if (fields.email?.length) out.email = "Enter a valid email address.";
    if (fields.password?.length) out.password = "Password must be 8 to 128 characters.";
    if (fields.name?.length) out.name = "Name must be 80 characters or fewer.";
    if (Object.keys(out).length) return out;
  }
  return { form: "Registration failed. Try again." };
}

export default function RegisterPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    if (password !== form.get("confirm")) {
      setErrors({ confirm: "Passwords do not match." });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, name: form.get("name") || undefined }),
      });
      if (!res.ok) {
        setErrors(
          res.status === 429
            ? { form: "Too many sign-ups from this network. Try again later." }
            : apiErrors(await res.json().catch(() => ({}))),
        );
        setLoading(false);
        return;
      }

      // Account created: sign straight in. If that fails, the account still exists, so send them to /login.
      const result = await signIn("credentials", { email, password, redirect: false });
      router.push(result?.error ? "/login" : "/chat");
      router.refresh();
    } catch {
      setErrors({ form: "Network error. Check your connection and try again." });
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free credits on sign-up. No card needed."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-emerald-400 underline underline-offset-2 hover:text-emerald-300">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate={false} className="flex flex-col gap-4">
        <Field id="name" label="Name" error={errors.name}>
          <input id="name" name="name" autoComplete="name" placeholder="Name (optional)" className={inputClass(!!errors.name)} />
        </Field>
        <Field id="email" label="Email" error={errors.email}>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={inputClass(!!errors.email)}
          />
        </Field>
        <Field id="password" label="Password" error={errors.password}>
          <PasswordInput
            id="password"
            name="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            placeholder="Password (min 8 chars)"
            invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
          />
        </Field>
        <Field id="confirm" label="Confirm password" error={errors.confirm}>
          <PasswordInput
            id="confirm"
            name="confirm"
            required
            autoComplete="new-password"
            placeholder="Confirm password"
            invalid={!!errors.confirm}
            aria-describedby={errors.confirm ? "confirm-error" : undefined}
          />
        </Field>
        {errors.form && (
          <p role="alert" className="text-sm text-red-400">
            {errors.form}
          </p>
        )}
        <button
          disabled={loading}
          className="rounded-lg bg-nimbus px-4 py-2 font-medium text-white transition hover:bg-nimbus-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:opacity-60"
        >
          {loading ? "Creating…" : "Sign up"}
        </button>
      </form>
    </AuthShell>
  );
}
