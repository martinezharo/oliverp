import { expect, test } from "@playwright/test";

/**
 * A manual adjustment, recorded through the demo.
 *
 * Nothing is stubbed: the form submits, the sample business in the tab takes
 * the movement, and both the product's history and the stock table are
 * expected to show it — which is the whole claim demo mode makes.
 */
test("saves a manual stock adjustment and refreshes its history", async ({ page }) => {
  const dialogs: string[] = [];
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  });

  await page.goto("/api/demo/start");
  await page.goto("/app/stock");
  await expect(page.getByRole("heading", { name: "Inventory & Stock", level: 1 })).toBeVisible();

  const productButton = page.locator("#stock-table tbody button").first();
  const product = (await productButton.textContent())?.trim() ?? "";
  const stockCell = page.locator("#stock-table tbody tr").filter({ hasText: product }).locator("td").nth(1);
  const before = Number((await stockCell.textContent())?.replace(/[^\d-]/g, ""));
  await productButton.click();

  const form = page.locator("dialog[open] form");
  await form.locator('input[name="units"]').fill("-2");
  await form.getByRole("button", { name: "Register adjustment" }).click();

  await expect(form.locator('input[name="units"]')).toHaveValue("");
  const adjustment = page.locator("dialog[open] tbody tr").filter({ hasText: "Manual Adjustment" });
  await expect(adjustment).toHaveCount(1);
  await expect(adjustment).toContainText("-2");
  expect(dialogs).toEqual([]);

  // The table behind the dialog is reading the same records.
  await page.keyboard.press("Escape");
  await expect(stockCell).toHaveText(String(before - 2));
});
