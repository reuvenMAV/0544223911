import { test, expect } from "@playwright/test";
import { startLearning } from "./helpers";

test("new learner sees onboarding with clickable choices", async ({ page }) => {
  await startLearning(page);
  await expect(page.getByText(/מה הכי מעניין אותך/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /אחר \/ הערות/ }),
  ).toBeVisible();
});
