import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CREDIT_PACKAGES } from "@/lib/stripe";
import { ProfileForm } from "@/components/account/ProfileForm";
import { PasswordForm } from "@/components/account/PasswordForm";
import { BuyCredits } from "@/components/account/BuyCredits";
import { DeleteAccount } from "@/components/account/DeleteAccount";

export const metadata = { title: "Account — Nimbus AI" };

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
  { id: "credits", label: "Credits" },
  { id: "danger", label: "Delete account" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const REASONS: Record<string, string> = {
  signup: "Sign-up bonus",
  topup: "Credit purchase",
  "chat:reserve": "Chat message",
  "chat:reconcile": "Chat message (longer reply)",
  "chat:refund": "Refund (failed reply)",
};

const date = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(d) + " UTC";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ tab?: string; topup?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tab: rawTab, topup } = await searchParams;
  const tab: TabId = TABS.some((t) => t.id === rawTab) ? (rawTab as TabId) : "profile";

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true, credits: true, createdAt: true, passwordHash: true, accounts: { select: { provider: true } } },
  });
  // A valid cookie for a deleted user: send them to sign in again.
  if (!user) redirect("/login");

  const hasPassword = !!user.passwordHash;
  const providers = [...new Set(user.accounts.map((a) => a.provider))];

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold text-white">
            Nimbus<span className="text-emerald-400">.</span>
          </Link>
          <Link href="/chat" className="text-sm text-zinc-300 transition hover:text-white">
            ← Back to chat
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-bold text-white">Account</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {user.email} · member since {new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(user.createdAt)}
        </p>

        <nav aria-label="Account sections" className="mt-8 flex gap-1 overflow-x-auto border-b border-zinc-800">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`/account?tab=${t.id}`}
              aria-current={t.id === tab ? "page" : undefined}
              className={
                "whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition " +
                (t.id === tab
                  ? "border-emerald-400 text-emerald-300"
                  : "border-transparent text-zinc-400 hover:text-zinc-100")
              }
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <section className="mt-8">
          {tab === "profile" && (
            <div className="flex flex-col gap-6">
              <ProfileForm initialName={user.name ?? ""} email={user.email} />
              <p className="text-sm text-zinc-400">
                Sign-in methods: {hasPassword ? "email and password" : null}
                {hasPassword && providers.length > 0 ? ", " : null}
                {providers.length > 0 ? providers.join(", ") : null}
                {!hasPassword && providers.length === 0 ? "none" : null}
              </p>
            </div>
          )}

          {tab === "security" && <PasswordForm hasPassword={hasPassword} />}

          {tab === "credits" && <CreditsTab userId={session.user.id} credits={user.credits} topup={topup} />}

          {tab === "danger" && <DeleteAccount email={user.email} hasPassword={hasPassword} />}
        </section>
      </main>
    </div>
  );
}

async function CreditsTab({ userId, credits, topup }: { userId: string; credits: number; topup?: string }) {
  const ledger = await db.creditLedger.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, delta: true, reason: true, balance: true, createdAt: true },
  });
  const packs = CREDIT_PACKAGES.filter((p) => p.priceId);

  return (
    <div className="flex flex-col gap-8">
      {topup === "success" && (
        <p role="status" className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          Payment received. Your credits appear here as soon as Stripe confirms the payment, usually within a few seconds.
        </p>
      )}
      <div>
        <p className="text-sm text-zinc-400">Balance</p>
        <p className="text-4xl font-bold text-white">
          {credits} <span className="text-lg font-medium text-zinc-400">credits</span>
        </p>
        <p className="mt-1 text-sm text-zinc-400">One credit covers about 1,000 tokens.</p>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-white">Buy credits</h2>
        <BuyCredits packs={packs} />
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-white">History</h2>
        {ledger.length === 0 ? (
          <p className="text-sm text-zinc-400">No credit activity yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Credit history, newest first</caption>
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">When</th>
                  <th scope="col" className="px-4 py-2 font-medium">What</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Change</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {ledger.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-400">{date(row.createdAt)}</td>
                    <td className="px-4 py-2 text-zinc-200">{REASONS[row.reason] ?? row.reason}</td>
                    <td className={"px-4 py-2 text-right font-mono " + (row.delta > 0 ? "text-emerald-400" : "text-zinc-300")}>
                      {row.delta > 0 ? `+${row.delta}` : row.delta}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-zinc-300">{row.balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {ledger.length === 50 && <p className="mt-2 text-xs text-zinc-500">Showing the latest 50 entries.</p>}
      </div>
    </div>
  );
}
