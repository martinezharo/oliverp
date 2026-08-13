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
  await expect(main.getByRole("heading", { name: "Danger zone" })).toBeVisible();

  await expect(main.getByRole("button", { name: "Delete project" })).toBeDisabled();
  await expect(main.getByRole("button", { name: "Delete my account" })).toBeDisabled();
  await expect(main.getByText("Destructive actions are disabled in demo mode.")).toBeVisible();
});

test("is reachable from the sidebar", async ({ page }) => {
  await page.goto("/app");
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/app\/ajustes/);
  await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();
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
});

test("refuses deletion for a caller with no session", async ({ request }) => {
  const project = await request.post("/api/projects/delete", { data: { projectId: 1 } });
  expect(project.status()).toBe(401);

  const account = await request.post("/api/account/delete");
  expect(account.status()).toBe(401);
});
