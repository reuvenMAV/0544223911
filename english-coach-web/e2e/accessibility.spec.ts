import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { startLearning } from "./helpers";

test("landing and chat pass basic accessibility checks", async ({ page }) => {
  await page.goto("/");
  const landingResults = await new AxeBuilder({ page }).analyze();
  expect(landingResults.violations).toEqual([]);

  await startLearning(page);
  const chatResults = await new AxeBuilder({ page }).analyze();
  expect(chatResults.violations).toEqual([]);
});
