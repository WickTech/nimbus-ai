/** Helpers for the chat history page: date buckets and search. */

export const BUCKETS = ["Today", "Yesterday", "Previous 7 days", "Previous 30 days", "Older"] as const;
export type Bucket = (typeof BUCKETS)[number];

const DAY = 24 * 60 * 60 * 1000;

/** Which group a conversation belongs to, by calendar day (UTC) relative to `now`. */
export function bucketFor(date: Date, now: Date): Bucket {
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const t = date.getTime();
  if (t >= startOfToday) return "Today";
  if (t >= startOfToday - DAY) return "Yesterday";
  if (t >= startOfToday - 7 * DAY) return "Previous 7 days";
  if (t >= startOfToday - 30 * DAY) return "Previous 30 days";
  return "Older";
}

/** Groups rows (already newest first) into labelled sections, keeping their order and skipping empty groups. */
export function groupByBucket<T extends { updatedAt: Date }>(rows: T[], now: Date): { label: Bucket; items: T[] }[] {
  const groups = new Map<Bucket, T[]>();
  for (const row of rows) {
    const label = bucketFor(row.updatedAt, now);
    groups.set(label, [...(groups.get(label) ?? []), row]);
  }
  return BUCKETS.filter((b) => groups.has(b)).map((label) => ({ label, items: groups.get(label)! }));
}

/** Prisma `where` for a search over titles and message text. Empty query means no filter. */
export function searchWhere(query: string) {
  const q = query.trim().slice(0, 100);
  if (!q) return {};
  // Postgres `contains` is case-sensitive unless told otherwise; SQLite has no `mode` option and already
  // matches ASCII case-insensitively.
  const mode = /^postgres/.test(process.env.DATABASE_URL ?? "") ? { mode: "insensitive" as const } : {};
  const match = { contains: q, ...mode };
  return { OR: [{ title: match }, { messages: { some: { content: match } } }] };
}
