import { randomUUID } from "node:crypto";
import { expect, login, signUpAndIn, test } from "./helpers";

// Generated per run: no password literals in the repo.
const NEW_PASSWORD = `np-${randomUUID()}`;
const WRONG_PASSWORD = `wp-${randomUUID()}`;

test.describe("account", () => {
  test("the account page is private", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login\?from=%2Faccount/);
  });

  test("the sidebar links to the account page", async ({ page, user }) => {
    await signUpAndIn(page, user);

    await page.locator("aside").getByRole("link", { name: user.email }).click();

    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByRole("heading", { name: "Account", exact: true })).toBeVisible();
  });

  test("a user can change their name", async ({ page, user }) => {
    await signUpAndIn(page, user);
    await page.goto("/account");

    await page.getByLabel("Name").fill("Asha Rao");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Profile saved.")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Name")).toHaveValue("Asha Rao");
  });

  test("changing the password: a wrong current password is refused, the right one works, and the new password signs in", async ({
    page,
    user,
  }) => {
    await signUpAndIn(page, user);
    await page.goto("/account?tab=security");

    await page.getByLabel("Current password").fill(WRONG_PASSWORD);
    await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
    await page.getByLabel("Confirm new password").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("Current password is incorrect.")).toBeVisible();

    await page.getByLabel("Current password").fill(user.password);
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("Password updated.")).toBeVisible();

    await page.goto("/chat");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/$/);
    await login(page, { ...user, password: NEW_PASSWORD });
  });

  test("mismatched new passwords are caught before anything is sent", async ({ page, user }) => {
    await signUpAndIn(page, user);
    await page.goto("/account?tab=security");

    await page.getByLabel("Current password").fill(user.password);
    await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
    await page.getByLabel("Confirm new password").fill(`x-${NEW_PASSWORD}`);
    await page.getByRole("button", { name: "Change password" }).click();

    await expect(page.getByText("Passwords do not match.")).toBeVisible();
  });

  test("the credits tab shows the balance and the sign-up bonus in the history", async ({ page, user }) => {
    await signUpAndIn(page, user);
    await page.goto("/account?tab=credits");

    await expect(page.getByText("3 credits")).toBeVisible(); // SIGNUP_FREE_CREDITS=3 in playwright.config.ts
    const row = page.getByRole("row", { name: /Sign-up bonus/ });
    await expect(row).toBeVisible();
    await expect(row).toContainText("+3");
  });

  test("deleting the account needs the email and password, then signs out and the login stops working", async ({
    page,
    user,
  }) => {
    await signUpAndIn(page, user);
    await page.goto("/account?tab=danger");

    await page.getByLabel(/Type .* to confirm/).fill("someone-else@example.test");
    await page.getByLabel("Password", { exact: true }).fill(user.password);
    await page.getByRole("button", { name: "Delete my account" }).click();
    await expect(page.getByText("That is not your email address.")).toBeVisible();

    await page.getByLabel(/Type .* to confirm/).fill(user.email);
    await page.getByRole("button", { name: "Delete my account" }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/login");
    await page.locator('input[name="email"]').fill(user.email);
    await page.locator('input[name="password"]').fill(user.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
  });
});
