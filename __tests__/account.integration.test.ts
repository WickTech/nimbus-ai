import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/** The account APIs (profile, password, delete) on a real database, with only the session mocked. */
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { grantCredits } from "@/lib/credits";
import { hashPassword, verifyPassword } from "@/lib/password";
import { PATCH, DELETE } from "@/app/api/account/route";
import { POST as changePassword } from "@/app/api/account/password/route";

afterAll(() => db.$disconnect());

beforeEach(() => vi.mocked(auth).mockReset());

// Generated per run: no password literals in the repo.
const PASSWORD = `pw-${randomUUID()}`;
const NEW_PASSWORD = `np-${randomUUID()}`;
const WRONG_PASSWORD = `wp-${randomUUID()}`;

async function newUser({ password = PASSWORD as string | null, name = "Asha" } = {}) {
  const user = await db.user.create({
    data: { email: `acct-${randomUUID()}@example.test`, name, passwordHash: password ? hashPassword(password) : null },
  });
  await grantCredits(db, user.id, 5, "signup");
  return user;
}

const signedInAs = (id: string | null) =>
  vi.mocked(auth).mockResolvedValue((id ? { user: { id } } : null) as never);

const json = (method: string, body: unknown) =>
  new Request("http://localhost/api/account", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("PATCH /api/account", () => {
  it("answers 401 without a session", async () => {
    signedInAs(null);
    expect((await PATCH(json("PATCH", { name: "x" }))).status).toBe(401);
  });

  it("saves a trimmed name", async () => {
    const user = await newUser();
    signedInAs(user.id);

    const res = await PATCH(json("PATCH", { name: "  Asha Rao  " }));

    expect(res.status).toBe(200);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).name).toBe("Asha Rao");
  });

  it("clears the name when it is empty", async () => {
    const user = await newUser();
    signedInAs(user.id);

    await PATCH(json("PATCH", { name: "   " }));

    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).name).toBeNull();
  });

  it("rejects a name over 80 characters and a malformed body", async () => {
    const user = await newUser();
    signedInAs(user.id);

    expect((await PATCH(json("PATCH", { name: "x".repeat(81) }))).status).toBe(400);
    expect((await PATCH(json("PATCH", {}))).status).toBe(400);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).name).toBe("Asha");
  });

  it("only ever changes the signed-in user's own row", async () => {
    const me = await newUser();
    const other = await newUser({ name: "Other" });
    signedInAs(me.id);

    await PATCH(json("PATCH", { name: "Changed" }));

    expect((await db.user.findUniqueOrThrow({ where: { id: other.id } })).name).toBe("Other");
  });
});

describe("POST /api/account/password", () => {
  it("answers 401 without a session", async () => {
    signedInAs(null);
    expect((await changePassword(json("POST", { newPassword: NEW_PASSWORD }))).status).toBe(401);
  });

  it("changes the password when the current one is right, and the old one stops working", async () => {
    const user = await newUser();
    signedInAs(user.id);

    const res = await changePassword(json("POST", { currentPassword: PASSWORD, newPassword: NEW_PASSWORD }));

    expect(res.status).toBe(200);
    const stored = (await db.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash!;
    expect(verifyPassword(NEW_PASSWORD, stored).ok).toBe(true);
    expect(verifyPassword(PASSWORD, stored).ok).toBe(false);
  });

  it("refuses a wrong current password and leaves the hash untouched", async () => {
    const user = await newUser();
    signedInAs(user.id);
    const before = (await db.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash;

    const res = await changePassword(json("POST", { currentPassword: WRONG_PASSWORD, newPassword: NEW_PASSWORD }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Current password is incorrect." });
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash).toBe(before);
  });

  it("requires the current password for accounts that have one", async () => {
    const user = await newUser();
    signedInAs(user.id);

    expect((await changePassword(json("POST", { newPassword: NEW_PASSWORD }))).status).toBe(400);
  });

  it("rejects a short new password and reusing the current one", async () => {
    const user = await newUser();
    signedInAs(user.id);

    expect((await changePassword(json("POST", { currentPassword: PASSWORD, newPassword: "short" }))).status).toBe(400);
    expect((await changePassword(json("POST", { currentPassword: PASSWORD, newPassword: PASSWORD }))).status).toBe(400);
  });

  it("lets an account without a password (OAuth sign-up) set one without a current password", async () => {
    const user = await newUser({ password: null });
    signedInAs(user.id);

    const res = await changePassword(json("POST", { newPassword: NEW_PASSWORD }));

    expect(res.status).toBe(200);
    const stored = (await db.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash!;
    expect(verifyPassword(NEW_PASSWORD, stored).ok).toBe(true);
  });

  it("throttles guesses at the current password", async () => {
    const user = await newUser();
    signedInAs(user.id);

    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      statuses.push((await changePassword(json("POST", { currentPassword: `${WRONG_PASSWORD}-${i}`, newPassword: NEW_PASSWORD }))).status);
    }

    expect(statuses.slice(0, 5)).toEqual([400, 400, 400, 400, 400]);
    expect(statuses.slice(5)).toEqual([429, 429]);
  });
});

describe("DELETE /api/account", () => {
  it("answers 401 without a session", async () => {
    signedInAs(null);
    expect((await DELETE(json("DELETE", { confirmEmail: "a@b.c" }))).status).toBe(401);
  });

  it("refuses when the typed email is not the account's email", async () => {
    const user = await newUser();
    signedInAs(user.id);

    const res = await DELETE(json("DELETE", { confirmEmail: "someone@else.test", password: PASSWORD }));

    expect(res.status).toBe(400);
    expect(await db.user.findUnique({ where: { id: user.id } })).not.toBeNull();
  });

  it("refuses a wrong password", async () => {
    const user = await newUser();
    signedInAs(user.id);

    const res = await DELETE(json("DELETE", { confirmEmail: user.email, password: WRONG_PASSWORD }));

    expect(res.status).toBe(400);
    expect(await db.user.findUnique({ where: { id: user.id } })).not.toBeNull();
  });

  it("deletes the user and everything that belongs to them, and nobody else", async () => {
    const user = await newUser();
    const other = await newUser();
    const convo = await db.conversation.create({ data: { userId: user.id, title: "mine" } });
    await db.message.create({ data: { conversationId: convo.id, role: "user", content: "hi" } });
    signedInAs(user.id);

    const res = await DELETE(json("DELETE", { confirmEmail: user.email.toUpperCase(), password: PASSWORD }));

    expect(res.status).toBe(200);
    expect(await db.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect(await db.conversation.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.message.count({ where: { conversationId: convo.id } })).toBe(0);
    expect(await db.creditLedger.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.user.findUnique({ where: { id: other.id } })).not.toBeNull();
    expect(await db.creditLedger.count({ where: { userId: other.id } })).toBe(1);
  });

  it("lets an account without a password delete itself by typing its email", async () => {
    const user = await newUser({ password: null });
    signedInAs(user.id);

    const res = await DELETE(json("DELETE", { confirmEmail: user.email }));

    expect(res.status).toBe(200);
    expect(await db.user.findUnique({ where: { id: user.id } })).toBeNull();
  });
});
