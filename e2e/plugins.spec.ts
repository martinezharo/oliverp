import { expect, test } from "@playwright/test";

test.describe("plugin and documentation workspace", () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: /View demo mode/ }).click();
    await expect(page.getByText("Demo Mode", { exact: true })).toBeVisible();
  });

  test("offers only private repository installation", async ({ page }) => {
    await page.goto("/app/plugins");
    await expect(page.getByRole("heading", { name: "Plugins", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /Plugin documentation/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Add a private plugin" })).toBeVisible();
    await expect(page.getByPlaceholder("https://github.com/your-account/private-plugin")).toBeDisabled();
    await expect(page.getByText("There is no public catalog.")).toBeVisible();
    await expect(page.getByText("No private plugins added")).toBeVisible();
    await expect(page.locator("iframe")).toHaveCount(0);

    await page.screenshot({ path: "test-results/plugins-desktop.png", fullPage: true });
  });

  test("renders repository documentation and keeps it reachable below settings", async ({ page }) => {
    await page.goto("/app/documentacion");
    await expect(page.getByRole("heading", { name: "Documentation", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /Plugin development/ })).toBeVisible();
    await page.getByRole("link", { name: /Plugin development/ }).click();
    await expect(page.getByRole("heading", { name: "Plugin development", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Security model" })).toBeVisible();
    await page.screenshot({ path: "test-results/documentation-desktop.png", fullPage: true });
  });

  test("keeps private plugin management usable on a narrow screen", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/app/plugins");
    await expect(page.getByRole("heading", { name: "Plugins", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Add a private plugin" })).toBeVisible();
    await expect(page.getByText("No private plugins added")).toBeVisible();

    // The bottom bar only carries the operational routes; documentation and
    // the other secondary destinations live behind "More".
    await page.getByRole("button", { name: "More" }).click();
    await expect(page.getByRole("link", { name: "Documentation", exact: true })).toBeVisible();
    await page.screenshot({ path: "test-results/plugins-mobile.png", fullPage: true });
  });
});
