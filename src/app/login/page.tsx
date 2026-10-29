import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signIn, auth } from "@/lib/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field, inputClass } from "@/components/auth/Field";
import { PasswordInput } from "@/components/auth/PasswordInput";

const buttonClass =
  "rounded-lg bg-nimbus px-4 py-2 font-medium text-white transition hover:bg-nimbus-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  if (await auth()) redirect("/chat");
  const { error } = await searchParams;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footer={
        <>
          No account?{" "}
          <Link href="/register" className="font-medium text-emerald-400 underline underline-offset-2 hover:text-emerald-300">
            Create one
          </Link>
        </>
      }
    >
      {/* GitHub OAuth */}
      {process.env.GITHUB_CLIENT_ID && (
        <>
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: "/chat" });
            }}
          >
            <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 font-medium text-zinc-100 transition hover:bg-zinc-800">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              Sign in with GitHub
            </button>
          </form>
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <span className="flex-1 border-t border-zinc-800" />
            or continue with email
            <span className="flex-1 border-t border-zinc-800" />
          </div>
        </>
      )}

      <form
        action={async (formData: FormData) => {
          "use server";
          try {
            await signIn("credentials", {
              email: formData.get("email"),
              password: formData.get("password"),
              redirectTo: "/chat",
            });
          } catch (err) {
            // Wrong email or password (or too many attempts): go back with a message instead of a crash page.
            // Anything else, including the redirect Next.js uses after a successful sign-in, must propagate.
            if (err instanceof AuthError) redirect("/login?error=credentials");
            throw err;
          }
        }}
        className="flex flex-col gap-4"
      >
        <Field id="email" label="Email">
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            aria-invalid={error ? true : undefined}
            className={inputClass(!!error)}
          />
        </Field>
        <Field id="password" label="Password">
          <PasswordInput
            id="password"
            name="password"
            required
            autoComplete="current-password"
            placeholder="Password"
            invalid={!!error}
          />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-red-400">
            Incorrect email or password. Try again.
          </p>
        )}
        <button className={buttonClass}>Sign in</button>
      </form>
    </AuthShell>
  );
}
