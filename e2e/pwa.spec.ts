import { expect, test } from "@playwright/test";

/**
 * What makes OlivERP installable.
 *
 * The install itself belongs to the browser and cannot be driven from a test,
 * so what is checked here is everything the browser reads before it offers
 * one: a manifest that opens the ERP rather than the landing page, icons that
 * actually exist, a service worker served from the root, and an offline page
 * reachable without a session — the worker precaches it before anyone has
 * signed in.
 */

test("serves a manifest that opens the application, not the landing page", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/manifest+json");

  const manifest = await response.json();
  expect(manifest.start_url).toBe("/app");
  expect(manifest.display).toBe("standalone");
  // The whole origin: the login round-trip has to stay inside the window.
  expect(manifest.scope).toBe("/");
  expect(manifest.short_name).toBe("OlivERP");

  // A browser needs a 192px icon to offer an install and a maskable one to
  // avoid drawing the mark in a white circle on Android.
  const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
  expect(sizes).toContain("192x192");
  expect(sizes).toContain("512x512");
  expect(manifest.icons.some((icon: { purpose: string }) => icon.purpose === "maskable")).toBe(true);

  for (const icon of manifest.icons) {
    const asset = await request.get(icon.src);
    expect(asset.status(), icon.src).toBe(200);
  }
});

test("serves the service worker from the root", async ({ request }) => {
  const response = await request.get("/sw.js");
  expect(response.status()).toBe(200);
  // Anything else and the browser refuses to register it.
  expect(response.headers()["content-type"]).toContain("javascript");
});

test("serves the offline fallback to a visitor with no session", async ({ request }) => {
  // No demo cookie and no login: exactly what the worker's precache is.
  const response = await request.get("/offline");
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("You are offline");
});

test("links the manifest and the apple touch icon from every page", async ({ page }) => {
  for (const path of ["/", "/login"]) {
    await page.goto(path);
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", /manifest\.webmanifest/);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/icons/apple-touch-icon.png");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#0f1016");
  }
});

test("offers the install control in settings", async ({ page }) => {
  await page.goto("/api/demo/start");
  await page.goto("/app/ajustes");

  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "App" })).toBeVisible();

  // Chromium fires `beforeinstallprompt` only for an origin it considers
  // installable, which a dev server is not, so the row is in its fallback
  // state: the sentence that says where the browser keeps the option.
  await expect(main.getByText(/installs it from its own menu/)).toBeVisible();

  // Replaying the event is what the real browser does; the row has to turn
  // into a button when it happens.
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt");
    Object.assign(event, {
      prompt: async () => undefined,
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });
    window.dispatchEvent(event);
  });

  await expect(main.getByRole("button", { name: "Install" })).toBeVisible();
});
