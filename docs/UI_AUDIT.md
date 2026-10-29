# UI + account audit (2026-10-29)

Scope: bring the app UI in line with the landing page (dark, emerald, free Aceternity components) and finish the
account features a SaaS needs. Email features (password reset, email verification) are **out of scope**: no email
sender is configured and the project sticks to free tooling.

## Findings

| # | Area | Finding | Phase |
|---|------|---------|-------|
| 1 | Theme | Landing is dark/emerald; app used indigo with OS light/dark. Two unrelated looks. | 1 |
| 2 | Navigation | Landing had no Sign in / Sign up links, only "Open the app". | 1 |
| 3 | Sign up | Redirected to /login after sign-up (user had to type credentials again). No confirm-password, no per-field errors, no show/hide, no network-error handling, no 429 message. | 1 |
| 4 | Sign in | No labels (placeholders only), no show/hide password, no autocomplete hints. | 1 |
| 5 | Account | No account page at all: no profile edit, no password change, no credit history, no account deletion. | 2 |
| 6 | Auth API | No endpoints for profile update, password change, account delete. `/account` not covered by the middleware matcher. | 2 |
| 7 | Credits | Users cannot see their ledger (what was spent, when, top-ups). Only a balance badge. | 2 |
| 8 | Sidebar | No rename or delete for conversations (open README roadmap item). No link to account. | 2-3 |
| 9 | Chat | Fixed 256px sidebar, unusable on phones. No auto-scroll to newest message, no stop button, no copy button, no low-credit warning, empty state is one sentence. | 3 |
| 10 | Resilience | No `not-found`, `error` or `loading` pages. | 4 |
| 11 | Docs/tests | README roadmap stale (Stripe, Markdown shipped; sidebar, OAuth not ticked). No e2e for account flows. | 4 |
| 12 | Known, deferred | Rate limiter is in-memory (best effort on serverless). Multi-model selector, team workspaces, analytics dashboard: separate features. | - |

## Phases (one PR each)

1. **Theme + shell + auth pages** (this PR): dark emerald tokens app-wide, site nav, redesigned sign in / sign up,
   sign-up signs in automatically, chat shell restyled.
2. **Account**: `/account` with profile, change password, credit history, buy credits, delete account.
3. **Chat polish**: responsive sidebar, rename/delete conversations, auto-scroll, stop, copy, low-credit banner.
4. **Finish**: not-found / error / loading pages, README roadmap, remaining e2e + a11y coverage.
