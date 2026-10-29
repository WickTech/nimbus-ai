import { afterEach, describe, expect, it, vi } from "vitest";
import { bucketFor, groupByBucket, searchWhere } from "@/lib/history";

// "Now" is Wed 2026-10-28 15:00 UTC, so today starts 2026-10-28 00:00 UTC.
const NOW = new Date("2026-10-28T15:00:00Z");
const at = (iso: string) => new Date(iso);

describe("bucketFor", () => {
  it("splits by calendar day, not by 24-hour windows", () => {
    expect(bucketFor(at("2026-10-28T00:00:00Z"), NOW)).toBe("Today");
    expect(bucketFor(at("2026-10-27T23:59:59Z"), NOW)).toBe("Yesterday");
    expect(bucketFor(at("2026-10-27T00:00:00Z"), NOW)).toBe("Yesterday");
    expect(bucketFor(at("2026-10-26T23:59:59Z"), NOW)).toBe("Previous 7 days");
    expect(bucketFor(at("2026-10-21T00:00:00Z"), NOW)).toBe("Previous 7 days");
    expect(bucketFor(at("2026-10-20T23:59:59Z"), NOW)).toBe("Previous 30 days");
    expect(bucketFor(at("2026-09-28T00:00:00Z"), NOW)).toBe("Previous 30 days");
    expect(bucketFor(at("2026-09-27T23:59:59Z"), NOW)).toBe("Older");
  });
});

describe("groupByBucket", () => {
  it("keeps the order, labels each group once and skips empty groups", () => {
    const rows = [
      { id: "a", updatedAt: at("2026-10-28T10:00:00Z") },
      { id: "b", updatedAt: at("2026-10-28T09:00:00Z") },
      { id: "c", updatedAt: at("2026-10-26T09:00:00Z") },
      { id: "d", updatedAt: at("2026-01-01T09:00:00Z") },
    ];

    const groups = groupByBucket(rows, NOW);

    expect(groups.map((g) => [g.label, g.items.map((r) => r.id)])).toEqual([
      ["Today", ["a", "b"]],
      ["Previous 7 days", ["c"]],
      ["Older", ["d"]],
    ]);
  });

  it("returns nothing for no rows", () => {
    expect(groupByBucket([], NOW)).toEqual([]);
  });
});

describe("searchWhere", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is empty for a blank query", () => {
    expect(searchWhere("")).toEqual({});
    expect(searchWhere("   ")).toEqual({});
  });

  it("matches the title or any message, trimmed and capped at 100 characters", () => {
    const where = searchWhere("  ledger  ") as { OR: unknown[] };
    expect(where.OR).toEqual([
      { title: { contains: "ledger" } },
      { messages: { some: { content: { contains: "ledger" } } } },
    ]);
    const long = searchWhere("x".repeat(500)) as { OR: [{ title: { contains: string } }] };
    expect(long.OR[0].title.contains).toHaveLength(100);
  });

  it("asks Postgres for a case-insensitive match", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pw@host/db");
    const where = searchWhere("Ledger") as unknown as { OR: [{ title: Record<string, unknown> }] };
    expect(where.OR[0].title).toEqual({ contains: "Ledger", mode: "insensitive" });
  });
});
