import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "live-auth.spec.ts",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3102",
    colorScheme: "light",
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "CONNECTOR_MODE=supabase NEXT_PUBLIC_CONNECTOR_MODE=supabase NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:59999 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_synthetic APP_ORIGIN=http://localhost:3102 pnpm --filter @utsikt/web dev --hostname localhost --port 3102",
    url: "http://localhost:3102/sign-in",
    reuseExistingServer: false,
    timeout: 120_000
  },
  projects: [{ name: "chromium-live", use: { ...devices["Desktop Chrome"] } }],
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.015
    }
  }
});
