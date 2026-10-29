import { expect, login, register, signUpAndIn, test } from "./helpers";

test.describe("accounts", () => {
  test("the chat is private: a visitor who is not signed in is sent to the login page", async ({ page }) => {
    await page.goto("/chat");
    await expect(page).toHaveURL(/\/login\?from=%2Fchat/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("signing up signs the new user straight in, with the free credits", async ({ page, user }) => {
    await register(page, user);

    await expect(page.getByText("Ask Nimbus anything to get started.")).toBeVisible();
    await expect(page.locator("aside").getByText("3 cr")).toBeVisible(); // SIGNUP_FREE_CREDITS=3 in playwright.config.ts
    await expect(page.locator("aside").getByText(user.email)).toBeVisible();
  });

  test("a returning user can sign in with email and password", async ({ page, user }) => {
    await register(page, user);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/$/);

    await login(page, user);

    await expect(page.locator("aside").getByText(user.email)).toBeVisible();
  });

  test("sign up refuses mismatched passwords and creates nothing", async ({ page, user }) => {
    await page.goto("/register");
    await page.getByPlaceholder("Email").fill(user.email);
    await page.getByPlaceholder("Password (min 8 chars)").fill(user.password);
    await page.getByPlaceholder("Confirm password").fill(user.password + "x");
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(page.getByText("Passwords do not match.")).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });

  test("the password fields can be revealed and hidden", async ({ page }) => {
    await page.goto("/login");
    const password = page.locator('input[name="password"]');
    await expect(password).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: "Show password" }).click();
    await expect(password).toHaveAttribute("type", "text");

    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(password).toHaveAttribute("type", "password");
  });

  test("the home page links to sign in and sign up", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Get started" }).click();
    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  });

  test("an email that is already registered gets a clear message", async ({ page, user }) => {
    await register(page, user);

    await page.goto("/register");
    await page.getByPlaceholder("Email").fill(user.email.toUpperCase()); // case does not matter
    await page.getByPlaceholder("Password (min 8 chars)").fill(user.password);
    await page.getByPlaceholder("Confirm password").fill(user.password);
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(page.getByText("Email already registered")).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });

  test("a wrong password does not sign anyone in", async ({ page, user }) => {
    await register(page, user);
    await page.getByRole("button", { name: "Sign out" }).click(); // sign-up signed us in
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/login");
    await page.locator('input[name="email"]').fill(user.email);
    await page.locator('input[name="password"]').fill("not-the-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    // Whatever the page shows, the user must not reach the chat...
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/\/chat/);
    // ...and should be told something went wrong instead of seeing a crash page.
    await expect(page.getByText(/incorrect|invalid|wrong|try again/i)).toBeVisible();
  });

  test("signing out returns to the home page and locks the chat again", async ({ page, user }) => {
    await signUpAndIn(page, user);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/chat");
    await expect(page).toHaveURL(/\/login/);
  });
});
