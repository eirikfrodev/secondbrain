import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) =>
    violation.impact === "serious" || violation.impact === "critical"
  );
  expect(serious).toEqual([]);
}

test("synthetic live routes enforce Google entry and protected access", async ({ page }) => {
  await page.goto("/sign-in?error=provider-detail-must-not-reflect");
  await expect(page.getByRole("link", { name: /Continue with Google/ })).toHaveAttribute(
    "href",
    "/api/auth/google/start"
  );
  await expect(page.getByText("provider-detail-must-not-reflect")).toHaveCount(0);
  await expectNoSeriousAxeViolations(page);

  for (const pathname of [
    "/today",
    "/week",
    "/month",
    "/activity",
    "/item/11111111-1111-4111-8111-111111111111"
  ]) {
    await page.goto(pathname);
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole("link", { name: /Continue with Google/ })).toBeVisible();
  }
});

test("synthetic live Auth routes emit correlated PKCE and stable failures", async ({ page }) => {
  const start = await page.request.get("/api/auth/google/start", { maxRedirects: 0 });
  expect(start.status()).toBe(307);
  expect(start.headers()["cache-control"]).toContain("no-store");
  expect(start.headers()["set-cookie"]).toContain("code-verifier");

  const authorizationUrl = new URL(start.headers().location ?? "");
  expect(authorizationUrl.origin).toBe("http://127.0.0.1:59999");
  expect(authorizationUrl.pathname).toBe("/auth/v1/authorize");
  expect(authorizationUrl.searchParams.get("provider")).toBe("google");
  expect(authorizationUrl.searchParams.get("scopes")).toBe("openid email profile");
  expect(authorizationUrl.searchParams.get("code_challenge_method")).toBe("s256");
  const redirectTo = new URL(authorizationUrl.searchParams.get("redirect_to") ?? "");
  expect(redirectTo.origin).toBe("http://localhost:3102");
  expect(redirectTo.pathname).toBe("/auth/callback");
  expect(redirectTo.searchParams.get("sb_flow_id")).toMatch(/^[A-Za-z0-9_-]{8,64}$/);

  const failed = await page.request.get(
    "/auth/callback?code=expired&sb_flow_id=11111111111111111111111111111111",
    { maxRedirects: 0 }
  );
  expect(failed.status()).toBe(303);
  expect(failed.headers().location).toBe(
    "http://localhost:3102/sign-in?error=google_sign_in_failed"
  );
  expect(failed.headers()["cache-control"]).toContain("no-store");
});

test("@visual live sign-in desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/sign-in");
  await expectNoSeriousAxeViolations(page);
  await expect(page).toHaveScreenshot("live-sign-in-1440.png", { fullPage: true });
});

test("@visual live sign-in mobile", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/sign-in");
  await expectNoSeriousAxeViolations(page);
  await expect(page).toHaveScreenshot("live-sign-in-mobile-393.png");
});
