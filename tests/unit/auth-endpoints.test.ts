import { describe, expect, it } from "vitest";
import type { ServerLocals } from "../../src/lib/server-context";

const { GET: signInGet, POST: signIn } = await import("../../src/internal/api/auth/signin");
const { POST: signOut } = await import("../../src/internal/api/auth/signout");
const { GET: signUpGet, POST: signUp } = await import("../../src/internal/api/auth/signup");

function context(request: Request) {
    return {
        request,
        locals: {} as ServerLocals,
        redirect: (location: string, status = 302) => new Response(null, { status, headers: { location } }),
    } as never;
}

describe("authentication endpoints", () => {
    it("redirects direct GET visits to the login page", async () => {
        const response = await signInGet(context(new Request("https://erp.test/api/auth/signin")));
        expect(response.status).toBe(302);
        expect(response.headers.get("location")).toBe("/login");
    });

    it("keeps the retired form sign-in endpoint harmless", async () => {
        const response = await signIn(context(new Request("https://erp.test/api/auth/signin", { method: "POST" })));

        expect(response.status).toBe(303);
        expect(response.headers.get("location")).toBe("/login?error=github");
    });

    it("does not proxy sign-out because Convex Auth owns the browser session", async () => {
        const response = await signOut(context(new Request("https://erp.test/api/auth/signout", { method: "POST" })));

        expect(response.status).toBe(303);
        expect(response.headers.get("location")).toBe("/login");
    });

    it("keeps the retired email signup endpoint disabled", async () => {
        const request = new Request("https://erp.test/api/auth/signup", {
            method: "POST",
        });
        const response = await signUp(context(request));

        expect(response.status).toBe(303);
        expect(response.headers.get("location")).toBe("/login");
    });

    it("redirects direct visits to the retired signup endpoint to login", async () => {
        const response = await signUpGet(context(new Request("https://erp.test/api/auth/signup")));
        expect(response.status).toBe(302);
        expect(response.headers.get("location")).toBe("/login");
    });
});
