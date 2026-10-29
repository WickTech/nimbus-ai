import { expect, expectCredits, send, signUpAndIn, test } from "./helpers";

test.describe("chat and credits", () => {
  test("a message is answered, costs 1 credit and is still there after a reload", async ({ page, user }) => {
    await signUpAndIn(page, user);

    await send(page, "Hello Nimbus");

    await expectCredits(page, "2 cr");
    // the saved conversation is in the sidebar, titled with the first message, and reopens with both messages
    await page.locator("aside").getByRole("link", { name: "Hello Nimbus" }).click();
    await expect(page.getByText("Hello Nimbus", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Echo: Hello Nimbus", { exact: true })).toBeVisible();
  });

  test("a long answer is billed from its real token usage (2,500 tokens = 3 credits)", async ({ page, user }) => {
    await signUpAndIn(page, user);

    await send(page, "LONGREPLY please");

    await expectCredits(page, "0 cr");
  });

  test("with no credits left the user is told so, not given a generic error", async ({ page, user }) => {
    await signUpAndIn(page, user); // 3 credits
    for (const text of ["one", "two", "three"]) await send(page, text);
    await expectCredits(page, "0 cr");

    // the banner appears and the composer locks; the 402 itself is covered by the route integration test
    await expect(page.getByRole("status")).toContainText("You're out of credits.");
    await expect(page.getByLabel("Message")).toBeDisabled();
    await expect(page.getByRole("status").getByRole("link", { name: "Top up" })).toBeVisible();
  });

  test("a failed model call shows an error and does not cost a credit", async ({ page, user }) => {
    await signUpAndIn(page, user);

    await page.getByPlaceholder("Message Nimbus…").fill("FAIL500 please");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByText("Something went wrong. Try again.")).toBeVisible({ timeout: 30_000 });
    await expectCredits(page, "3 cr");
  });

  test("nobody else can see or open my conversations", async ({ page, user, browser }) => {
    await signUpAndIn(page, user);
    await send(page, "my private question");
    await page.reload();
    const href = await page.locator("aside").getByRole("link", { name: "my private question" }).getAttribute("href");
    expect(href).toMatch(/^\/chat\?id=/);

    // a second user in a separate browser session
    const otherContext = await browser.newContext({
      extraHTTPHeaders: { "x-forwarded-for": "10.77.77.77" },
      baseURL: page.url().split("/chat")[0],
    });
    const other = await otherContext.newPage();
    await signUpAndIn(other, { ...user, email: `other-${user.email}` });

    await expect(other.getByText("No conversations yet.")).toBeVisible();
    await other.goto(href!); // the first user's conversation id
    await expect(other.getByText("my private question")).toHaveCount(0);
    await expect(other.getByText("What can Nimbus help with?")).toBeVisible();
    await otherContext.close();
  });

  test("suggestion fills the composer, assistant reply can be copied, low-credit banner shows", async ({ page, user }) => {
    await signUpAndIn(page, user); // 3 credits
    await expect(page.getByRole("status")).toContainText("Only 3 credits left.");
    await page.getByRole("button", { name: /JWT sessions/ }).click();
    await expect(page.getByLabel("Message")).toHaveValue(/JWT sessions/);
    await send(page, "hello copy");
    await expect(page.getByRole("button", { name: "Copy" })).toBeVisible();
  });

  test("mobile: sidebar is a drawer", async ({ page, user }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await signUpAndIn(page, user);
    await expect(page.getByRole("link", { name: "All chats & search →" })).not.toBeInViewport();
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("link", { name: "All chats & search →" })).toBeInViewport();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("link", { name: "All chats & search →" })).not.toBeInViewport();
  });
});
