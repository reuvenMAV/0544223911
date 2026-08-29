import { test, expect } from "@playwright/test";
import { startLearning } from "./helpers";

test("progress resumes after refresh", async ({ page }) => {
  await startLearning(page);
  await page.getByRole("button", { name: /סדרות וסרטים/ }).click();
  await expect(page.getByText(/דוגמה ספציפית/)).toBeVisible();

  const cookies = await page.context().cookies();
  const learnerCookie = cookies.find((c) =>
    c.name.includes("english_coach_learner_id"),
  );
  expect(learnerCookie?.value).toBeTruthy();

  await page.reload();
  await expect(
    page.getByText(/ממשיכים|דוגמה ספציפית|מה הכי מעניין/),
  ).toBeVisible({ timeout: 15_000 });
});
