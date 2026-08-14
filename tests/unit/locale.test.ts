import { describe, expect, it } from "vitest";

import {
    DEFAULT_LOCALE,
    localeHref,
    negotiateLocale,
    splitLocale,
} from "../../src/i18n/locale";
import { localeAlternates } from "../../src/i18n/metadata";
import { getTranslator } from "../../src/i18n/t";

describe("splitLocale", () => {
    it("reads the language off the front and hands back the path underneath", () => {
        expect(splitLocale("/es/app/stock")).toEqual({ lang: "es", path: "/app/stock" });
        expect(splitLocale("/es")).toEqual({ lang: "es", path: "/" });
    });

    it("treats an unprefixed path as the default language", () => {
        expect(splitLocale("/app/stock")).toEqual({ lang: "en", path: "/app/stock" });
        expect(splitLocale("/")).toEqual({ lang: "en", path: "/" });
    });

    it("does not mistake a path that merely starts with those letters", () => {
        // `/estadisticas` is a page, not Spanish.
        expect(splitLocale("/estadisticas")).toEqual({ lang: "en", path: "/estadisticas" });
        expect(splitLocale("/espana/app")).toEqual({ lang: "en", path: "/espana/app" });
    });

    it("leaves an explicit default prefix alone rather than stripping it", () => {
        // `/en/...` is redirected to its canonical form before it ever renders,
        // so nothing downstream should be taught to accept it as an address.
        expect(splitLocale("/en/app")).toEqual({ lang: "en", path: "/en/app" });
    });
});

describe("localeHref", () => {
    it("prefixes everything but the default language", () => {
        expect(localeHref("es", "/app/stock")).toBe("/es/app/stock");
        expect(localeHref("en", "/app/stock")).toBe("/app/stock");
    });

    it("does not leave a trailing slash on the home page", () => {
        expect(localeHref("es", "/")).toBe("/es");
        expect(localeHref("en", "/")).toBe("/");
    });

    it("round-trips with splitLocale", () => {
        for (const path of ["/", "/login", "/app", "/app/documentacion/api"]) {
            expect(splitLocale(localeHref("es", path)).path).toBe(path);
        }
    });
});

describe("negotiateLocale", () => {
    it("honours quality values rather than order", () => {
        expect(negotiateLocale("en;q=0.4,es;q=0.9")).toBe("es");
        expect(negotiateLocale("es;q=0.2,en;q=0.8")).toBe("en");
    });

    it("matches a regional tag to its language", () => {
        expect(negotiateLocale("es-419")).toBe("es");
        expect(negotiateLocale("es-ES,es;q=0.9,en;q=0.8")).toBe("es");
    });

    it("skips languages OlivERP does not have", () => {
        expect(negotiateLocale("fr-FR,fr;q=0.9,es;q=0.5")).toBe("es");
        expect(negotiateLocale("fr-FR,de;q=0.9")).toBe(DEFAULT_LOCALE);
    });

    it("falls back to the default for anything it cannot read", () => {
        expect(negotiateLocale(null)).toBe(DEFAULT_LOCALE);
        expect(negotiateLocale("")).toBe(DEFAULT_LOCALE);
        expect(negotiateLocale("*")).toBe(DEFAULT_LOCALE);
        expect(negotiateLocale("es;q=0")).toBe(DEFAULT_LOCALE);
    });
});

describe("localeAlternates", () => {
    it("makes each language canonical for itself and lists all of them", () => {
        const english = localeAlternates("en", "/");
        const spanish = localeAlternates("es", "/");

        expect(english.canonical).toBe("/");
        expect(spanish.canonical).toBe("/es");
        // Both sides advertise the same set, or search engines ignore it.
        expect(english.languages).toEqual(spanish.languages);
    });

    it("points x-default at the unprefixed page", () => {
        expect(localeAlternates("es", "/").languages?.["x-default"]).toBe("/");
    });
});

describe("translator", () => {
    it("renders the same key in each language", () => {
        expect(getTranslator("es").t("nav.stock")).toBe("Stock");
        expect(getTranslator("es").t("nav.home")).toBe("Inicio");
        expect(getTranslator("en").t("nav.home")).toBe("Home");
    });

    it("falls back to English rather than printing a key at the reader", () => {
        // Nothing in the Spanish dictionary has this key; the English one does.
        const spanish = getTranslator("es");
        expect(spanish.t("nav.home")).not.toBe("nav.home");
        expect(spanish.t("no.such.key.anywhere")).toBe("no.such.key.anywhere");
    });

    it("interpolates every occurrence of a placeholder", () => {
        expect(getTranslator("en").t("dashboard.day", { current: 3, total: 30 })).toContain("3/30");
    });

    it("formats numbers and dates the way each language writes them", () => {
        const spanish = getTranslator("es");
        const english = getTranslator("en");

        // Spanish groups with dots and decimalises with commas; English the
        // other way round. This is why the formatters travel with the strings.
        expect(spanish.formatCurrency(1234.5)).not.toBe(english.formatCurrency(1234.5));
        expect(spanish.formatCurrency(1234.5)).toContain(",");
        expect(english.formatCurrency(1234.5)).toContain(".");

        const march = "2026-03-15";
        expect(spanish.formatDate(march, { month: "long" })).toBe("marzo");
        expect(english.formatDate(march, { month: "long" })).toBe("March");
    });
});
