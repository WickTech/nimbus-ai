import { redirect } from "next/navigation";
import Link from "next/link";
import { signIn, auth } from "@/lib/auth";

export default async function LoginPage() {
  if (await auth()) redirect("/chat");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-bold">Welcome back</h1>

      {/* GitHub OAuth */}
      {process.env.GITHUB_CLIENT_ID && (
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/chat" });
          }}
        >
          <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            Sign in with GitHub
          </button>
        </form>
      )}

      <div className="flex items-center gap-3 text-sm text-zinc-400">
        <span className="flex-1 border-t border-zinc-200 dark:border-zinc-800" />
        or continue with email
        <span className="flex-1 border-t border-zinc-200 dark:border-zinc-800" />
      </div>

      <form
        action={async (formData: FormData) => {
          "use server";
          await signIn("credentials", {
            email: formData.get("email"),
            password: formData.get("password"),
            redirectTo: "/chat",
          });
        }}
        className="flex flex-col gap-3"
      >
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          className="rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button className="rounded-lg bg-nimbus px-4 py-2 font-medium text-white hover:bg-nimbus-dark">
          Sign in
        </button>
      </form>
      <p className="text-sm text-zinc-500">
        No account?{" "}
        <Link href="/register" className="text-nimbus underline-offset-2 hover:underline">
          Create one
        </Link>
      </p>
    </main>
  );
}
