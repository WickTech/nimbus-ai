import { randomUUID } from "node:crypto";
import { expect, test as base, type Page } from "@playwright/test";

export interface TestUser {
  name: string;
  email: string;
  password: string;
}

export const test = base.extend<{ user: TestUser; clientIp: void }>({
  // The app limits sign-ups (5 per hour) and logins (10 per 15 minutes) per client IP, kept in memory. Every
  // test pretends to come from its own address so the tests never trip those limits on each other.
  clientIp: [
    async ({ context }, use) => {
      const octet = () => 1 + Math.floor(Math.random() * 253);
      await context.setExtraHTTPHeaders({ "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}` });
      await use();
    },
    { auto: true },
  ],
  // A brand-new user (never reused), so tests do not depend on each other.
  // eslint-disable-next-line no-empty-pattern
  user: async ({}, use) => {
    await use({ name: "Asha Test", email: `e2e-${randomUUID()}@example.test`, password: "e2e-pass-12345" });
  },
});

export { expect };

export async function register(page: Page, user: TestUser) {
  await page.goto("/register");
  await page.getByPlaceholder("Name (optional)").fill(user.name);
  await page.getByPlaceholder("Email").fill(user.email);
  await page.getByPlaceholder("Password (min 8 chars)").fill(user.password);
  await page.getByPlaceholder("Confirm password").fill(user.password);
  await page.getByRole("button", { name: "Sign up" }).click();
  // Sign-up signs the new user straight in.
  await expect(page).toHaveURL(/\/chat/);
}

export async function login(page: Page, user: TestUser) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/chat/);
}

/** Creates the account (which signs in) and leaves the page on /chat. */
export async function signUpAndIn(page: Page, user: TestUser) {
  await register(page, user);
}

/** Sends one chat message and waits for the streamed answer. */
export async function send(page: Page, text: string, expectedReply = `Echo: ${text}`) {
  await page.getByPlaceholder("Message Nimbus…").fill(text);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(expectedReply, { exact: true })).toBeVisible();
  // the Send button is disabled while a reply is streaming
  await expect(page.getByRole("button", { name: "Send" })).toBeDisabled(); // empty input again
}

/**
 * Waits until the sidebar shows the expected credit balance. The balance is rendered by the server and settled
 * just after a reply finishes streaming, so this reloads and retries instead of reading it once.
 */
export async function expectCredits(page: Page, expected: string) {
  await expect
    .poll(
      async () => {
        await page.reload();
        return (await page.locator("aside").getByText(/ cr$/).innerText()).trim();
      },
      { timeout: 20_000, intervals: [250, 500, 1000] },
    )
    .toBe(expected);
}
