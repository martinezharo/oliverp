import { expect, test } from "@playwright/test";

/**
 * The settings screen in demo mode.
 *
 * Demo mode is the only state reachable without a GitHub account, so this
 * covers what it is there to prove: the page renders inside the normal shell
 * and every destructive control is inert. The deletion logic itself is covered
 * against the real backend in `convex/authorization.test.ts`.
 */
test.beforeEach(async ({ page }) => {
  await page.goto("/api/demo/start");
});

test("renders the settings page with destructive actions disabled", async ({ page }) => {
  await page.goto("/app/ajustes");
  const main = page.getByRole("main");

  await expect(main.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();
  await expect(main.getByRole("heading", { name: "Your projects" })).toBeVisible();
  await expect(main.getByRole("heading", { name: "Account" })).toBeVisible();

  await expect(main.getByRole("button", { name: "Delete project" })).toBeDisabled();
  await expect(main.getByRole("button", { name: "Delete account" })).toBeDisabled();
  await expect(main.getByText("Destructive actions are disabled in demo mode.")).toBeVisible();
});

test("is reachable from the sidebar", async ({ page }) => {
  await page.goto("/app");
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/app\/ajustes/);
  await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();
});

test("manages API keys from the project row with every control inert", async ({ page }) => {
  await page.goto("/app/ajustes");
  await page.getByRole("button", { name: "Manage API keys" }).click();

  const dialog = page.locator("dialog[open]");
  await expect(dialog.getByRole("heading", { name: "API keys" })).toBeVisible();
  await expect(dialog).toContainText("Demo project");

  // The sample key renders the real row, and the secret itself is never in it.
  await expect(dialog.getByText("n8n")).toBeVisible();
  await expect(dialog.getByText("erp_sk_4f2a9c…")).toBeVisible();
  // Scoped to the row: "Read and write" is also an option in the create form.
  await expect(dialog.getByRole("listitem").getByText("Read and write")).toBeVisible();

  await expect(dialog.getByText("API keys cannot be created in demo mode.")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Create API key" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Revoke" })).toBeDisabled();
  await expect(dialog.getByLabel("Name")).toBeDisabled();

  // Not `fullPage`: a native <dialog> lives in the top layer and only composites
  // correctly in a viewport capture. The wait lets the open animation finish so
  // the capture is of the settled frame.
  await page.waitForTimeout(400);
  await page.screenshot({ path: "test-results/settings-api-keys.png" });
});

// `page.request` inherits the browser context, and therefore the demo cookie;
// the bare `request` fixture does not, which makes it the unauthenticated case.
test("refuses deletion in demo mode at the API level", async ({ page }) => {
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
