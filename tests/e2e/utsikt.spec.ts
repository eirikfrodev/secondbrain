import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) =>
    violation.impact === "serious" || violation.impact === "critical"
  );
  expect(serious).toEqual([]);
}

test("Today renders deterministic state and keyboard focus is safe", async ({ page }) => {
  await page.goto("/today");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Three things need you");
  await expect(page.getByRole("heading", { name: "Needs you" })).toBeVisible();

  await page.keyboard.press("j");
  const focusedRow = page.locator(".item-row.is-focused");
  await expect(focusedRow).toContainText("Copenhagen hotel");

  await page.keyboard.press("1");
  await expect(page.getByRole("button", { name: "Choose Hotel Sanders" })).toBeFocused();
  await expect(focusedRow).not.toContainText("Handled in mock mode");
});

test("an item expands in place and neighbours remain visible", async ({ page }) => {
  await page.goto("/today");
  await page.keyboard.press("j");
  await page.keyboard.press("e");
  await expect(page.getByTestId("expanded-item")).toContainText("Hotel Sanders");
  await expect(page.getByText("Cabin architect", { exact: false })).toBeVisible();
});

test("Ask queues and cancels an attached instruction", async ({ page }) => {
  await page.goto("/today");
  await page.keyboard.press("a");
  const input = page.getByLabel("Add an instruction to this item");
  await input.fill("Find another day next week instead");
  await input.press("Enter");
  await expect(page.getByText("will run in the 09:40 sync", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "cancel" }).click();
  await expect(page.getByText("will run in the 09:40 sync", { exact: false })).toHaveCount(0);
});

test("external approval is reviewable and cancellable in mock mode", async ({ page }) => {
  await page.goto("/item/anders");
  await page.getByRole("button", { name: "Send reply — Thursday 14:00" }).click();
  await expect(page.getByText("Mock approval staged for 30 seconds.")).toBeVisible();
  await expect(page.getByText("No Gmail or Calendar call will be made.")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Mock approval staged for 30 seconds.")).toHaveCount(0);
});

test("mobile keeps the primary action direct and reveals alternatives", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/today");
  const firstItem = page.locator(".item-row").first();
  await expect(firstItem.getByRole("button", { name: "Reply: Thursday 14:00" })).toBeVisible();
  await firstItem.getByRole("button", { name: "Show alternative actions" }).click();
  await expect(firstItem.getByRole("button", { name: "Suggest Friday 10:00" })).toBeVisible();
});

test("Week, Month, activity, and unknown fallback render", async ({ page }) => {
  await page.goto("/week");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Thursday is the heavy day");
  await page.goto("/month");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Protect the final Friday");
  await page.goto("/activity");
  await expect(page.getByText("password-protected", { exact: false })).toBeVisible();
  await page.goto("/item/unknown");
  await expect(page.getByText("Three locations were found.", { exact: false })).toBeVisible();
  await expect(page.locator("[data-original-block='interactive_map_v2']")).toBeVisible();
});

test("Today and approval have no serious axe violations", async ({ page }) => {
  await page.goto("/today");
  await expectNoSeriousAxeViolations(page);
  await page.goto("/item/anders");
  await expectNoSeriousAxeViolations(page);
});

test("@visual Today desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/today");
  await expect(page).toHaveScreenshot("today-1440.png", { fullPage: true });
});

test("@visual expanded hotel", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 760 });
  await page.goto("/today");
  await page.keyboard.press("j");
  await page.keyboard.press("e");
  await expect(page).toHaveScreenshot("expanded-900.png", { fullPage: true });
});

test("@visual Week desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/week");
  await expect(page).toHaveScreenshot("week-1440.png", { fullPage: true });
});

test("@visual Month desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/month");
  await expect(page).toHaveScreenshot("month-1440.png", { fullPage: true });
});

test("@visual draft review", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 760 });
  await page.goto("/item/anders");
  await expect(page).toHaveScreenshot("draft-900.png", { fullPage: true });
});

test("@visual Mobile Today", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/today");
  await expect(page).toHaveScreenshot("mobile-today-393.png");
});

test("@visual Mobile approval", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/item/anders");
  await expect(page).toHaveScreenshot("mobile-approval-393.png");
});
