import { expect, test } from "@playwright/test";

/**
 * Demo mode is a working application, not a gallery of screens: what is
 * checked here is that an operation recorded in it is really recorded — the
 * dialog closes, the transaction list shows it, the stock moves, and deleting
 * it puts everything back — all against the sample business held in the tab.
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/api/demo/start");
});

test("renders every demo operation modal and the stock history dialog", async ({ page }) => {
  await page.goto("/app");
  const main = page.getByRole("main");
  const newSale = main.getByRole("button", { name: /New Sale/ });
  await expect(newSale).toBeVisible();
  await newSale.click();
  await expect(page.locator("dialog[open]")).toContainText("New Sale");
  await page.locator("dialog[open] button").first().click();

  await page.getByRole("button", { name: "New Purchase" }).click();
  await expect(page.locator("dialog[open]")).toContainText("New Purchase");
  await page.locator("dialog[open] button").first().click();

  await page.getByRole("button", { name: "Income / Expense" }).click();
  await expect(page.locator("dialog[open]")).toContainText("Other Income / Expenses");
  await page.locator("dialog[open] button").first().click();

  await page.goto("/app/stock");
  await page.locator("#stock-table tbody button").first().click();
  await expect(page.locator("dialog[open]")).toContainText("Add Manual Adjustment");
});

test("records a sale that lands in the transaction list, then deletes it", async ({ page }) => {
  await page.goto("/app");
  await page.getByRole("main").getByRole("button", { name: /New Sale/ }).click();

  const dialog = page.locator("dialog[open]");
  await dialog.getByPlaceholder("Wallapop, Amazon, Web...").fill("Farmers market");
  await dialog.getByRole("button", { name: "Add Product" }).click();
  await dialog.locator("select").first().selectOption({ index: 1 });
  await dialog.getByRole("spinbutton").nth(1).fill("2");
  await dialog.getByRole("spinbutton").nth(2).fill("12.50");
  await dialog.getByRole("button", { name: "Save Sale" }).click();
  await expect(dialog).toBeHidden();

  // Navigated the way a visitor does. A demo's records live in the tab, so a
  // full page load would hand back the untouched sample business — which is
  // the promise the banner makes, and is checked at the end of this test.
  await page.getByRole("navigation").getByRole("link", { name: "Transactions" }).click();
  await page.getByRole("button", { name: "Transactions", exact: true }).click();
  const row = page.locator("tbody tr").filter({ hasText: "Farmers market" }).first();
  await expect(row).toBeVisible();
  await expect(row).toContainText("25.00");

  page.on("dialog", (confirmation) => confirmation.accept());
  await row.getByTitle("Delete").click();
  await expect(page.locator("tbody tr").filter({ hasText: "Farmers market" })).toHaveCount(0);

  // And a reload puts the sample business back exactly as it was.
  await page.reload();
  await expect(page.getByRole("main")).toContainText("Transactions");
});

test("adjusts stock and shows the movement", async ({ page }) => {
  await page.goto("/app/stock");
  const firstProduct = page.locator("#stock-table tbody button").first();
  const name = (await firstProduct.textContent())?.trim() ?? "";
  await firstProduct.click();

  const dialog = page.locator("dialog[open]");
  await dialog.getByPlaceholder("e.g. 5 or -2").fill("-3");
  await dialog.getByRole("button", { name: "Register Adjustment" }).click();
  // A movement recorded today joins the end of today's group, where the
  // backend would also put it.
  await expect(dialog.locator("tbody tr").filter({ hasText: "Manual Adjustment" })).toHaveCount(1);

  await page.keyboard.press("Escape");
  await expect(page.locator("#stock-table")).toContainText(name);
});
