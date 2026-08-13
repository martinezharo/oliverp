import { test, expect } from "@playwright/test";

test.describe("Next/Convex Auth shell", () => {
  test("renders the minimal GitHub login and demo option", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeVisible();
    await expect(page.getByRole("link", { name: "View demo mode" })).toBeVisible();

    const subtitle = page.getByText("Use the authorized GitHub account to sign in");
    const githubButton = page.getByRole("button", { name: "Continue with GitHub" });
    const [subtitleBox, buttonBox] = await Promise.all([subtitle.boundingBox(), githubButton.boundingBox()]);
    expect(subtitleBox).not.toBeNull();
    expect(buttonBox).not.toBeNull();
    expect(buttonBox!.y - (subtitleBox!.y + subtitleBox!.height)).toBeLessThan(60);
  });

  test("enters demo mode through the Worker API and renders the dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "View demo mode" }).click();

    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByText("Demo Mode", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Octopus Control/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "New Sale" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "New Purchase" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Income / Expense" })).toBeVisible();
  });

  test("keeps all application pages reachable from the demo shell", async ({ page }) => {
    await page.goto("/api/demo/start");

    for (const [path, heading] of [
      ["/app/stock", "Inventory & Stock"],
      ["/app/transacciones", "Transactions"],
      ["/app/historial", "History"],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    }
  });
});
