import { test, expect } from "@playwright/test";
import {
  completeOnboarding,
  completePlacement,
  completePlanningAndLesson,
  startLearning,
} from "./helpers";

test("learner can progress from placement through recap", async ({ page }) => {
  test.setTimeout(120_000);
  await startLearning(page);
  await completeOnboarding(page);
  await completePlacement(page);
  await expect(page.getByText(/ההערכה שלי/)).toBeVisible();
  await completePlanningAndLesson(page);
  await expect(page.getByText(/סיימנו את השיעור הראשון/)).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    page.getByRole("button", { name: /לפתוח סיכום שיעור/ }),
  ).toBeVisible();
});
