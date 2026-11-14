import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// The landing page at phone and desktop width: layout holds, the three feature pictures show everywhere, the
// anchors work, reduced motion is honoured, and the page has no stray code windows or dashes in its text.
const SIZES = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
];

for (const size of SIZES) {
  test.describe(`landing at ${size.name} width`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test("has no sideways scrolling", async ({ page }) => {
      await page.goto("/");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("shows the headline and the main button on the first screen, with no code window", async ({ page }) => {
      await page.goto("/");
      const h1 = await page.getByRole("heading", { level: 1 }).boundingBox();
      const cta = await page.getByRole("link", { name: "Get started free" }).first().boundingBox();
      expect(h1 && h1.y + h1.height).toBeLessThanOrEqual(size.height);
      expect(cta && cta.y + cta.height).toBeLessThanOrEqual(size.height);
      await expect(page.locator("pre")).toHaveCount(0);
    });

    test("shows all three feature pictures", async ({ page }) => {
      await page.goto("/");
      const visuals = page.locator("[data-feature-visual]");
      await expect(visuals).toHaveCount(3);
      for (let i = 0; i < 3; i++) await expect(visuals.nth(i)).toBeVisible();
    });

    test("has one main landmark and the three sections the nav points to", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("main")).toHaveCount(1);
      for (const id of ["features", "flow", "pricing"]) await expect(page.locator(`#${id}`)).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 2, name: "What is wired together" })).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: "How a request flows" })).toBeVisible();
    });

    test("has no em or en dashes in its visible text", async ({ page }) => {
      await page.goto("/");
      const text = await page.locator("body").innerText();
      expect(text).not.toMatch(/[—–]/);
    });

    test("attaches a full-page screenshot", async ({ page }, testInfo) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      await testInfo.attach(`landing-${size.name}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });
    });
  });
}

test.describe("landing navigation", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the nav links scroll to their sections", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main" });
    for (const [label, id] of [
      ["Features", "features"],
      ["How it works", "flow"],
      ["Pricing", "pricing"],
    ]) {
      await nav.getByRole("link", { name: label }).click();
      await expect(page.locator(`#${id}`)).toBeInViewport();
    }
  });
});

test.describe("landing on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the menu reaches the sections and closes after a choice", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Menu", { exact: true }).click();
    await page.getByRole("link", { name: "Pricing" }).first().click();
    await expect(page.locator("#pricing")).toBeInViewport();
    await expect(page.locator("details[open]")).toHaveCount(0);
  });

  test("has no automatic accessibility violations at phone width", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.html.slice(0, 110)}`))).toEqual([]);
  });
});

test("reduced motion switches off the entrance and the rail fill", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const names = await page.evaluate(() =>
    [...document.querySelectorAll(".rise, .flow-fill, .caret")].map((el) => getComputedStyle(el).animationName),
  );
  expect(names.length).toBeGreaterThan(0);
  expect(new Set(names)).toEqual(new Set(["none"]));
});
