import { expect, test } from "@playwright/test";

test.describe("plugin workspace", () => {
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
    // Scoped to `main`, like the assertions around it.
    await expect(page.getByRole("main").getByText("No private plugins added")).toBeVisible();
    await expect(page.locator("iframe")).toHaveCount(0);

    await page.screenshot({ path: "test-results/plugins-desktop.png", fullPage: true });
  });

  test("sends the app documentation link to the public route", async ({ page }) => {
    await page.goto("/app/plugins");
    const docsLink = page.locator("[data-app-sidebar]").getByRole("link", { name: "Documentation", exact: true });
    await expect(docsLink).toHaveAttribute("href", "/documentation");
    await docsLink.click();
    await expect(page).toHaveURL(/\/documentation$/);
    await expect(page.locator("[data-app-sidebar]")).toHaveCount(0);
    await expect(page.locator("[data-app-header]")).toHaveCount(0);
  });

  test("keeps private plugin management usable on a narrow screen", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/app/plugins");
    await expect(page.getByRole("heading", { name: "Plugins", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Add a private plugin" })).toBeVisible();
    // Scoped to `main`, like the assertions around it.
    await expect(page.getByRole("main").getByText("No private plugins added")).toBeVisible();

    // The bottom bar only carries the operational routes; documentation and
    // the other secondary destinations live behind "More".
    await page.getByRole("button", { name: "More" }).click();
    await expect(page.getByRole("link", { name: "Documentation", exact: true })).toBeVisible();
    await page.screenshot({ path: "test-results/plugins-mobile.png", fullPage: true });
  });
});

test.describe("public documentation", () => {
  test("renders without authentication or the app shell", async ({ page }) => {
    await page.goto("/documentation");
    await expect(page).toHaveURL(/\/documentation$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { name: "Documentation", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /User guide/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Plugin development/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Public API/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Engineering audit/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Contributing/ })).toHaveCount(0);
    await expect(page.locator("[data-app-shell]")).toHaveCount(0);
    await expect(page.locator("[data-app-sidebar]")).toHaveCount(0);
    await expect(page.locator("[data-app-header]")).toHaveCount(0);

    await page.getByRole("link", { name: /User guide/ }).click();
    await expect(page).toHaveURL(/\/documentation\/guide$/);
    await expect(page.getByRole("heading", { name: "User guide", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Start here" })).toBeVisible();
    await expect(page.locator("[data-app-sidebar]")).toHaveCount(0);
    await page.screenshot({ path: "test-results/documentation-desktop.png", fullPage: true });
  });

  test("redirects the former app documentation addresses", async ({ page }) => {
    await page.goto("/app/documentacion/api");
    await expect(page).toHaveURL(/\/documentation\/api$/);
    await expect(page.getByRole("heading", { name: "Public API", level: 1 })).toBeVisible();

    await page.goto("/es/app/documentacion/guide");
    await expect(page).toHaveURL(/\/es\/documentation\/guide$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.getByRole("heading", { name: "Guía de uso", level: 1 })).toBeVisible();
  });
});
