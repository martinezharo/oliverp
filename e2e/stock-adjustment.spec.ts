import { expect, test } from "@playwright/test";

test("saves a manual stock adjustment and refreshes its history", async ({ page }) => {
  let savedAdjustment: { productId: number; units: number; date: string } | null = null;
  const dialogs: string[] = [];

  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  });

  await page.route("**/api/stock/adjust", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    savedAdjustment = JSON.parse(route.request().postData() ?? "null") as typeof savedAdjustment;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { id: 999 } }),
    });
  });

  await page.route("**/api/stock/movements**", async (route) => {
    if (!savedAdjustment) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [{
          fecha: savedAdjustment.date,
          tipo: "ajuste manual",
          unidades: savedAdjustment.units,
          precio: null,
          canal: "Manual",
        }],
      }),
    });
  });

  await page.goto("/api/demo/start");
  await page.goto("/stock");
  await expect(page.getByRole("heading", { name: "Inventory & Stock", level: 1 })).toBeVisible();

  await page.locator("#stock-table tbody button").first().click();
  const form = page.locator("dialog[open] form");
  await form.locator('input[name="units"]').fill("-2");
  await form.getByRole("button", { name: "Register adjustment" }).click();

  await expect(form.locator('input[name="units"]')).toHaveValue("");
  await expect(page.locator("dialog[open] tbody")).toContainText("Manual Adjustment");
  await expect(page.locator("dialog[open] tbody")).toContainText("-2");
  expect(savedAdjustment).toMatchObject({ units: -2 });
  expect(dialogs).toEqual([]);
});
