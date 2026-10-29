import { expect, send, signUpAndIn, test } from "./helpers";

test.describe("chat history", () => {
  test("the history page is private", async ({ page }) => {
    await page.goto("/history");
    await expect(page).toHaveURL(/\/login\?from=%2Fhistory/);
  });

  test("follow-up messages stay in one conversation instead of splitting the history", async ({ page, user }) => {
    await signUpAndIn(page, user);
    await send(page, "first question");
    await send(page, "second question");

    await page.goto("/history");

    const entries = page.getByRole("listitem").filter({ hasText: "message" });
    await expect(entries).toHaveCount(1);
    await expect(entries.first()).toContainText("first question");
    await expect(entries.first()).toContainText("4 messages");
  });

  test("an old chat can be reopened, and switching chats swaps the messages", async ({ page, user }) => {
    await signUpAndIn(page, user);
    await send(page, "alpha topic");
    await page.locator("aside").getByRole("link", { name: "New chat" }).click();
    await send(page, "beta topic");
    await page.reload();

    await page.locator("aside").getByRole("link", { name: "alpha topic" }).click();
    await expect(page.getByText("Echo: alpha topic", { exact: true })).toBeVisible();
    await expect(page.getByText("Echo: beta topic", { exact: true })).toHaveCount(0);

    await page.locator("aside").getByRole("link", { name: "beta topic" }).click();
    await expect(page.getByText("Echo: beta topic", { exact: true })).toBeVisible();
    await expect(page.getByText("Echo: alpha topic", { exact: true })).toHaveCount(0);
  });

  test("search finds chats by title and by message text", async ({ page, user }) => {
    await signUpAndIn(page, user);
    await send(page, "alpha topic");
    await page.locator("aside").getByRole("link", { name: "New chat" }).click();
    await send(page, "beta topic");

    await page.goto("/history");
    await page.getByRole("searchbox", { name: "Search your chats" }).fill("beta");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByRole("link", { name: "beta topic" })).toBeVisible();
    await expect(page.getByRole("link", { name: "alpha topic" })).toHaveCount(0);

    await page.getByRole("link", { name: "Clear search" }).click();
    await expect(page.getByRole("link", { name: "alpha topic" })).toBeVisible();

    await page.getByRole("searchbox", { name: "Search your chats" }).fill("zzz-nothing");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText("No chats match that search.")).toBeVisible();
  });

  test("a chat can be renamed and deleted from the history page", async ({ page, user }) => {
    await signUpAndIn(page, user);
    await send(page, "alpha topic");
    await page.goto("/history");

    await page.getByRole("button", { name: "Rename alpha topic" }).click();
    await page.getByLabel("Chat name").fill("Renamed chat");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("link", { name: "Renamed chat" })).toBeVisible();
    await expect(page.getByRole("link", { name: "alpha topic" })).toHaveCount(0);

    await page.getByRole("button", { name: "Delete Renamed chat" }).click();
    await page.getByRole("button", { name: "Keep" }).click();
    await expect(page.getByRole("link", { name: "Renamed chat" })).toBeVisible();

    await page.getByRole("button", { name: "Delete Renamed chat" }).click();
    await page.getByRole("button", { name: "Yes, delete" }).click();
    await expect(page.getByText("No conversations yet.")).toBeVisible();
  });
});
