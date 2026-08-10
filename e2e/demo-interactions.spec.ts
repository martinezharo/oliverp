import { expect, test } from "@playwright/test";

test("renders every demo operation modal and the stock history dialog", async ({ page }) => {
  await page.goto("/api/demo/start");

  await page.goto("/");
  await expect(page.locator("#btn-open-venta")).toBeVisible();
  await page.locator("#btn-open-venta").click();
  await expect(page.locator("dialog[open]")).toContainText("New Sale");
  await page.locator("dialog[open] button").first().click();

  await page.getByRole("button", { name: "New Purchase" }).click();
  await expect(page.locator("dialog[open]")).toContainText("New Purchase");
  await page.locator("dialog[open] button").first().click();

  await page.getByRole("button", { name: "Income / Expense" }).click();
  await expect(page.locator("dialog[open]")).toContainText("Other Income / Expenses");
  await page.locator("dialog[open] button").first().click();

  await page.goto("/stock");
  await page.locator("#stock-table tbody button").first().click();
  await expect(page.locator("dialog[open]")).toContainText("Add Manual Adjustment");
});
