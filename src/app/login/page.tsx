import { redirect } from "next/navigation";
import Link from "next/link";
import { signIn, auth } from "@/lib/auth";

export default async function LoginPage() {
  if (await auth()) redirect("/chat");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-bold">Welcome back</h1>
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
