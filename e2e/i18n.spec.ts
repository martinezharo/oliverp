import { expect, test } from "@playwright/test";

/**
 * Spanish lives at its own addresses.
 *
 * The point of the prefix is that a page is one thing at one URL: `/es` is the
 * Spanish landing page for everybody who opens it, not "the landing page as
 * rendered for whoever asked". So these check the addresses and what comes
 * back from them, rather than any in-page state.
 */

test.describe("locale routing", () => {
  test("serves English at the unprefixed address", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("accountant");
  });

  test("serves Spanish under /es", async ({ page }) => {
    await page.goto("/es");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("contable");
  });

  test("redirects a Spanish browser to the Spanish page", async ({ browser }) => {
    const context = await browser.newContext({ locale: "es-ES" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/es$/);
    await context.close();
  });

  test("leaves an explicitly requested English page alone for a Spanish browser", async ({ browser }) => {
    const context = await browser.newContext({ locale: "es-ES" });
    const page = await context.newPage();
    // The switcher's choice is a cookie, and it outranks the browser header.
    await context.addCookies([{ name: "erp_lang", value: "en", url: "http://127.0.0.1:4330" }]);
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await context.close();
  });

  test("sends the explicit English prefix to its canonical address", async ({ page }) => {
    await page.goto("/en");
    await expect(page).toHaveURL(/\/$/);
  });

  test("keeps the language across a sign-in redirect", async ({ page }) => {
    await page.goto("/es/app");
    await expect(page).toHaveURL(/\/es\/login$/);

    await page.goto("/app");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("switches language and stays on the same page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("group", { name: "Language" }).getByText("ES").click();

    await expect(page).toHaveURL(/\/es$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");

    // And back, which is the half that a cookie written on the way out breaks.
    await page.getByRole("group", { name: "Idioma" }).getByText("EN").click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("runs the whole application in Spanish", async ({ page }) => {
    await page.goto("/api/demo/start");
    await page.goto("/es/app/historial");

    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.getByRole("heading", { name: "Historial Financiero", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Inicio" })).toBeVisible();
    // Every link out of the page keeps the reader in Spanish.
    await expect(page.getByRole("link", { name: "Stock" })).toHaveAttribute("href", /^\/es\/app\/stock/);
  });

  test("translates the screens that used to be English-only", async ({ page }) => {
    await page.goto("/api/demo/start");

    await page.goto("/es/app/plugins");
    await expect(page.getByRole("heading", { name: "Añadir un plugin privado" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Revisar plugin" })).toBeVisible();
    await expect(page.getByRole("main").getByText("No hay plugins privados añadidos")).toBeVisible();

    await page.goto("/es/app/documentacion");
    await expect(page.getByRole("heading", { name: "Documentación", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /Desarrollo de plugins/ })).toBeVisible();

    // The documents stay in the language they are written in, and say so.
    await page.goto("/es/app/documentacion/api");
    await expect(page.getByRole("heading", { name: "API pública", level: 1 })).toBeVisible();
    await expect(page.getByText(/se mantiene en inglés/)).toBeVisible();
  });

  test("formats money and dates the way the language writes them", async ({ page }) => {
    await page.goto("/api/demo/start");

    // The rollup arrives over the Convex subscription, so the amounts are not
    // in the document at first paint; reading before they land compares two
    // empty screens and passes for the wrong reason.
    await page.goto("/app/historial");
    await expect(page.getByRole("main")).toContainText("€", { timeout: 15_000 });
    const english = await page.getByRole("main").innerText();

    await page.goto("/es/app/historial");
    await expect(page.getByRole("main")).toContainText("€", { timeout: 15_000 });
    const spanish = await page.getByRole("main").innerText();

    // Spanish decimalises with a comma; English with a point.
    expect(spanish).toMatch(/\d+,\d{2}\s*€/);
    expect(english).toMatch(/€\d/);
  });

  test("does not put a language in front of the API", async ({ browser }) => {
    const context = await browser.newContext({ locale: "es-ES" });
    const page = await context.newPage();
    // A Spanish browser must not have `/api/demo/start` rewritten under `/es`,
    // which would simply be a 404.
    const response = await page.goto("/api/demo/start");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/(es\/)?app$/);
    await context.close();
  });
});

test.describe("search engine metadata", () => {
  test("declares the canonical page and both of its languages", async ({ page }) => {
    for (const [path, canonical] of [["/", "/"], ["/es", "/es"]] as const) {
      await page.goto(path);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${canonical === "/" ? "" : canonical}$`));
      await expect(page.locator('link[rel="alternate"][hreflang="es"]')).toHaveAttribute("href", /\/es$/);
      await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
    }
  });

  test("keeps the application and the login screen out of every index", async ({ page }) => {
    await page.goto("/api/demo/start");
    for (const path of ["/app/stock", "/es/app/stock"]) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    }

    await page.goto("/api/demo/exit");
    await page.goto("/login");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("publishes a sitemap naming both languages, and a robots.txt pointing at it", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    const rules = await robots.text();
    expect(rules).toContain("Disallow: /app");
    expect(rules).toContain("Sitemap:");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const xml = await sitemap.text();
    expect(xml).toContain('hreflang="en"');
    expect(xml).toContain('hreflang="es"');
  });

  test("describes itself to a crawler without inventing anything", async ({ page }) => {
    await page.goto("/");
    const json = await page.locator('script[type="application/ld+json"]').innerText();
    const data = JSON.parse(json);

    expect(data["@type"]).toBe("SoftwareApplication");
    expect(data.offers.price).toBe("0");
    expect(data.inLanguage).toBe("en");
    // Nothing that would be a fabricated claim about the product.
    expect(data.aggregateRating).toBeUndefined();
  });
});
