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

    it("leaves the browser's Better Auth endpoints public", () => {
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

    it("redirects unauthenticated page requests to the login page", () => {
        for (const path of ["/", "/stock", "/transacciones", "/historial"]) {
            expect(routePolicy(path), path).toBe("session_redirect");
        }
    });

    it("keeps the complete Better Auth route namespace public", () => {
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
