import AxeBuilder from "@axe-core/playwright";
import { expect, send, signUpAndIn, test } from "./helpers";

// Automated accessibility checks (axe). They catch the mechanical problems (contrast, labels, landmarks);
// they cannot replace trying the app with a keyboard and a screen reader.
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function violations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  return results.violations.flatMap((v) =>
    v.nodes.map((n) => `${v.id} (${v.impact}): ${n.html.slice(0, 110)} -> ${n.any[0]?.message ?? n.failureSummary}`),
  );
}

test.describe("accessibility", () => {
  for (const path of ["/", "/login", "/register"]) {
    test(`${path} has no automatic accessibility violations`, async ({ page }) => {
      await page.goto(path);
      expect(await violations(page)).toEqual([]);
    });
  }

  for (const tab of ["profile", "security", "credits", "danger"]) {
    test(`the account ${tab} tab has no automatic accessibility violations`, async ({ page, user }) => {
      await signUpAndIn(page, user);
      await page.goto(`/account?tab=${tab}`);
      await expect(page.getByRole("heading", { name: "Account", exact: true })).toBeVisible();
      expect(await violations(page)).toEqual([]);
    });
  }

  test("the history page has no automatic accessibility violations", async ({ page, user }) => {
    await signUpAndIn(page, user);
    await send(page, "a question for the history");
    await page.goto("/history");
    await expect(page.getByRole("heading", { name: "Chat history" })).toBeVisible();
    expect(await violations(page)).toEqual([]);
  });

  test("the chat page has no automatic accessibility violations", async ({ page, user }) => {
    await signUpAndIn(page, user);
    expect(await violations(page)).toEqual([]);
  });
});
