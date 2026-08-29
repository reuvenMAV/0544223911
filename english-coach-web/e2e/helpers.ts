import { expect, type Page } from "@playwright/test";

export async function startLearning(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "התחל ללמוד" })).toBeVisible();
  await page.getByRole("link", { name: "התחל ללמוד" }).click();
  await expect(page.getByText("מורה אישי לאנגלית")).toBeVisible();
  await expect(page.getByRole("button", { name: /סדרות וסרטים/ })).toBeVisible({
    timeout: 15_000,
  });
}

export async function clickChoice(page: Page, label: RegExp | string) {
  const button =
    typeof label === "string"
      ? page.getByRole("button", { name: label })
      : page.getByRole("button", { name: label });
  await expect(button.first()).toBeVisible();
  await button.first().click();
}

export async function clickFirstNumberedChoice(page: Page) {
  const button = page.locator("button").filter({ hasText: /^1\./ }).first();
  await expect(button).toBeVisible();
  await button.click();
}

export async function completeOnboarding(page: Page) {
  await clickChoice(page, /סדרות וסרטים/);
  await clickChoice(page, /קומדיה/);
  await clickChoice(page, /מוזיקה/);
  await clickChoice(page, /מבוגר/);
  await clickChoice(page, /לדבר בביטחון/);
  await clickChoice(page, /הכול —/);
  await clickChoice(page, /הכול מדויק/);
}

export async function completePlacement(page: Page) {
  await clickChoice(page, /קדימה/);
  for (let i = 0; i < 8; i += 1) {
    await clickFirstNumberedChoice(page);
  }
}

export async function completePlanningAndLesson(page: Page) {
  await clickChoice(page, /3 שיעורים/);
  await clickChoice(page, /20–25/);
  await clickChoice(page, /כן, בואו נתחיל שיעור 1/);
  await clickChoice(page, /I watch/);
  await clickChoice(page, /every week/);
  await clickChoice(page, /watched an episode/);
}
