import { expect, test } from "@playwright/test";

/**
 * The settings screen in demo mode.
 *
 * Demo mode is the only state reachable without a GitHub account. What it has
 * to prove here is that the screen is the real one and its controls work —
 * projects and keys can be managed — while the two actions that would need an
 * account behind them stay out of reach. The deletion logic itself is covered
 * against the real backend in `convex/authorization.test.ts`.
 */
test.beforeEach(async ({ page }) => {
  await page.goto("/api/demo/start");
});

test("lists the demo projects and keeps account actions out of reach", async ({ page }) => {
  await page.goto("/app/settings");
  const main = page.getByRole("main");

  await expect(main.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();
  await expect(main.getByRole("heading", { name: "Your projects" })).toBeVisible();
  await expect(main.getByRole("heading", { name: "Account" })).toBeVisible();
  await expect(main.getByText("Northwind Gadgets")).toBeVisible();
  await expect(main.getByText("Blue Harbor Coffee")).toBeVisible();

  // A demo project is the visitor's to delete; the account behind the demo
  // does not exist, so signing out of it or deleting it cannot mean anything.
  await expect(main.getByRole("button", { name: "Delete project" }).first()).toBeEnabled();
  await expect(main.getByRole("button", { name: "Delete account" })).toBeDisabled();
  await expect(main.getByText("In demo mode changes live in this tab only and are lost on reload.")).toBeVisible();
});

test("deletes a demo project from the browser alone", async ({ page }) => {
  await page.goto("/app/settings");
  const main = page.getByRole("main");
  const row = main.getByRole("listitem").filter({ hasText: "Blue Harbor Coffee" });

  await row.getByRole("button", { name: "Delete project" }).click();
  const dialog = page.locator("dialog[open]");
  await dialog.getByRole("textbox").fill("Blue Harbor Coffee");
  await dialog.getByRole("button", { name: "Delete project" }).click();

  await expect(main.getByText("Blue Harbor Coffee")).toHaveCount(0);
  await expect(main.getByText("Northwind Gadgets")).toBeVisible();
});

test("is reachable from the sidebar", async ({ page }) => {
  await page.goto("/app");
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/app\/settings/);
  await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();
});

test("mints and revokes an API key from the project row", async ({ page }) => {
  await page.goto("/app/settings");
  await page.getByRole("button", { name: "Manage API keys" }).first().click();

  const dialog = page.locator("dialog[open]");
  await expect(dialog.getByRole("heading", { name: "API keys" })).toBeVisible();
  await expect(dialog).toContainText("Northwind Gadgets");

  // The sample keys render the real rows, and no secret is ever in one.
  await expect(dialog.getByText("n8n automation")).toBeVisible();
  await expect(dialog.getByText("erp_sk_4f2a9c…")).toBeVisible();
  // Scoped to the row: "Read and write" is also an option in the create form.
  await expect(dialog.getByRole("listitem").getByText("Read and write").first()).toBeVisible();

  // Minting works, and the secret is shown exactly once, hidden until asked for.
  await dialog.getByLabel("Name").fill("Warehouse scanner");
  await dialog.getByRole("button", { name: "Create API key" }).click();
  await expect(dialog.getByText("erp_sk_••••••••••••••••")).toBeVisible();
  await expect(dialog.getByText("Warehouse scanner")).toBeVisible();

  const row = dialog.getByRole("listitem").filter({ hasText: "Warehouse scanner" });
  await row.getByRole("button", { name: "Revoke" }).click();
  await row.getByRole("button", { name: "Revoke" }).click();
  await expect(dialog.getByRole("listitem").filter({ hasText: "Warehouse scanner" })).toHaveCount(0);

  // Not `fullPage`: a native <dialog> lives in the top layer and only composites
  // correctly in a viewport capture. The wait lets the open animation finish so
  // the capture is of the settled frame.
  await page.waitForTimeout(400);
  await page.screenshot({ path: "test-results/settings-api-keys.png" });
});

test("redirects the old Spanish settings route to the English canonical URL", async ({ page }) => {
  await page.goto("/app/ajustes");
  await expect(page).toHaveURL(/\/app\/settings$/);
  await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();
});

// The application answers its own demo requests in the browser, so these
// endpoints are only ever reached by something outside it — and there is no
// demo account for them to change.
//
// `page.request` inherits the browser context, and therefore the demo cookie;
// the bare `request` fixture does not, which makes it the unauthenticated case.
test("refuses account changes in demo mode at the API level", async ({ page }) => {
  const project = await page.request.post("/api/projects/delete", {
    data: { projectId: 1 },
  });
  expect(project.status()).toBe(403);

  const account = await page.request.post("/api/account/delete");
  expect(account.status()).toBe(403);

  const key = await page.request.post("/api/keys/create", {
    data: { projectId: 1, name: "demo", scopes: ["read"] },
  });
  expect(key.status()).toBe(403);
});

test("refuses deletion for a caller with no session", async ({ request }) => {
  const project = await request.post("/api/projects/delete", { data: { projectId: 1 } });
  expect(project.status()).toBe(401);

  const account = await request.post("/api/account/delete");
  expect(account.status()).toBe(401);

  const created = await request.post("/api/keys/create", {
    data: { projectId: 1, name: "intruder", scopes: ["read"] },
  });
  expect(created.status()).toBe(401);

  const revoked = await request.post("/api/keys/revoke", { data: { keyId: "anything" } });
  expect(revoked.status()).toBe(401);
});
