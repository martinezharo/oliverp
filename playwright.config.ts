import { defineConfig, devices } from "@playwright/test";

const port = 4330;
const externalBaseUrl = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: externalBaseUrl ?? `http://127.0.0.1:${port}`,
    locale: "en-US",
    trace: "on-first-retry",
  },
  ...(externalBaseUrl
    ? {}
    : {
        webServer: {
          command: `pnpm exec next dev --hostname 127.0.0.1 --port ${port}`,
          url: `http://127.0.0.1:${port}`,
          reuseExistingServer: false,
          timeout: 120_000,
        },
      }),
});
