import { describe, expect, it } from "vitest";
import { routePolicy } from "../../src/lib/auth/routes";

describe("routePolicy", () => {
    it("leaves the login page and the sign-in endpoint open", () => {
        expect(routePolicy("/login")).toBe("public");
        expect(routePolicy("/signup")).toBe("public");
        expect(routePolicy("/api/auth/signin")).toBe("public");
    });

    it("lets the machine-facing API resolve its own auth", () => {
        expect(routePolicy("/api/v1/ventas")).toBe("self_authenticated");
        expect(routePolicy("/api/v1/openapi.json")).toBe("self_authenticated");
    });

    it("leaves the browser's Convex Auth compatibility endpoints public", () => {
        // These are fetched by scripts: an HTML login page returned with a 200
        // would be parsed as a successful response.
        for (const path of [
            "/api/sales/create",
            "/api/sales/get",
            "/api/purchases/create",
            "/api/transactions/delete",
            "/api/transactions/list",
            "/api/stock/adjust",
            "/api/products/create",
            "/api/stats/evolution",
        ]) {
            expect(routePolicy(path), path).toBe("session_json");
        }
        expect(routePolicy("/api/auth/signout")).toBe("public");
    });

    it("serves the landing page to anyone", () => {
        expect(routePolicy("/")).toBe("public");
    });

    it("serves every public documentation page to anyone", () => {
        for (const path of ["/documentation", "/documentation/guide", "/documentation/api"]) {
            expect(routePolicy(path), path).toBe("public");
        }
    });

    it("serves the offline fallback to anyone", () => {
        // The service worker precaches it with no session in hand; gating it
        // would store the login page under that URL instead.
        expect(routePolicy("/offline")).toBe("public");
    });

    it("redirects unauthenticated page requests to the login page", () => {
        for (const path of ["/app", "/app/stock", "/app/transacciones", "/app/historial"]) {
            expect(routePolicy(path), path).toBe("session_redirect");
        }
    });

    it("does not treat a lookalike path as the application", () => {
        // Public prefixes must not accidentally open similarly named pages.
        expect(routePolicy("/application")).toBe("session_redirect");
        expect(routePolicy("/appointments")).toBe("session_redirect");
        expect(routePolicy("/documentationx")).toBe("session_redirect");
    });

    it("keeps the complete Convex Auth compatibility namespace public", () => {
        expect(routePolicy("/api/auth/signin/evil")).toBe("public");
        expect(routePolicy("/login/../api/sales/create")).toBe("session_redirect");
        expect(routePolicy("/loginx")).toBe("session_redirect");
    });

    it("does not treat a lookalike path as the self-authenticating API", () => {
        expect(routePolicy("/api/v1")).toBe("session_json");
        expect(routePolicy("/api/v10/ventas")).toBe("session_json");
        expect(routePolicy("/evil/api/v1/ventas")).toBe("session_redirect");
    });
});
