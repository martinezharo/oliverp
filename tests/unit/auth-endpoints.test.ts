import { beforeEach, describe, expect, it, vi } from "vitest";

const proxyAuthRequest = vi.fn();

vi.mock("../../src/lib/runtime", () => ({ isDemoMode: () => false }));
vi.mock("../../src/lib/auth-proxy", () => ({
    proxyAuthRequest: (...args: unknown[]) => proxyAuthRequest(...args),
    copySetCookieHeaders: (source: Headers, target: Headers) => {
        const getSetCookie = (source as Headers & { getSetCookie?: () => string[] }).getSetCookie;
        for (const value of getSetCookie ? getSetCookie.call(source) : [source.get("set-cookie")].filter(Boolean)) {
            target.append("set-cookie", value as string);
        }
    },
}));

const { GET: signInGet, POST: signIn } = await import("../../src/pages/api/auth/signin");
const { POST: signOut } = await import("../../src/pages/api/auth/signout");
const { GET: signUpGet, POST: signUp } = await import("../../src/pages/api/auth/signup");

function context(request: Request) {
    return {
        request,
        locals: {} as App.Locals,
        redirect: (location: string, status = 302) => new Response(null, { status, headers: { location } }),
    } as never;
}

beforeEach(() => proxyAuthRequest.mockReset());

describe("authentication endpoints", () => {
    it("proxies Better Auth and forwards its session cookies", async () => {
        const upstream = new Response(JSON.stringify({ user: { id: "u1" } }), { status: 200 });
        upstream.headers.append("set-cookie", "better-auth.session_token=abc; Path=/");
        proxyAuthRequest.mockResolvedValue(upstream);

        const request = new Request("https://erp.test/api/auth/signin", {
            method: "POST",
            body: new URLSearchParams({ email: "user@example.test", password: "secret" }),
        });
        const response = await signIn(context(request));

        expect(response.status).toBe(302);
        expect(response.headers.get("location")).toBe("/");
        expect(response.headers.get("set-cookie")).toContain("better-auth.session_token=abc");
        expect(proxyAuthRequest).toHaveBeenCalledWith(
            expect.anything(),
            "sign-in/email",
            JSON.stringify({ email: "user@example.test", password: "secret", rememberMe: true }),
        );
    });

    it("redirects failed credentials back to the login page", async () => {
        proxyAuthRequest.mockResolvedValue(new Response(JSON.stringify({ message: "Invalid credentials" }), { status: 401 }));
        const request = new Request("https://erp.test/api/auth/signin", {
            method: "POST",
            body: new URLSearchParams({ email: "user@example.test", password: "wrong" }),
        });
        const response = await signIn(context(request));
        expect(response.status).toBe(302);
        expect(response.headers.get("location")).toBe("/login?error=invalid_credentials");
    });

    it("redirects direct GET visits to the login page", async () => {
        const response = await signInGet(context(new Request("https://erp.test/api/auth/signin")));
        expect(response.status).toBe(302);
        expect(response.headers.get("location")).toBe("/login");
    });

    it("proxies sign-out and redirects to login", async () => {
        const upstream = new Response(null, { status: 200 });
        upstream.headers.append("set-cookie", "better-auth.session_token=; Max-Age=0; Path=/");
        proxyAuthRequest.mockResolvedValue(upstream);
        const response = await signOut(context(new Request("https://erp.test/api/auth/signout", { method: "POST" })));

        expect(response.status).toBe(302);
        expect(response.headers.get("location")).toBe("/login");
        expect(proxyAuthRequest).toHaveBeenCalledWith(expect.anything(), "sign-out", "{}");
    });

    it("creates an account and forwards its session cookie", async () => {
        const upstream = new Response(JSON.stringify({ user: { id: "u1" } }), { status: 200 });
        upstream.headers.append("set-cookie", "better-auth.session_token=abc; Path=/");
        proxyAuthRequest.mockResolvedValue(upstream);

        const request = new Request("https://erp.test/api/auth/signup", {
            method: "POST",
            body: new URLSearchParams({ name: "User", email: "user@example.test", password: "secret123" }),
        });
        const response = await signUp(context(request));

        expect(response.status).toBe(303);
        expect(response.headers.get("location")).toBe("/");
        expect(response.headers.get("set-cookie")).toContain("better-auth.session_token=abc");
        expect(proxyAuthRequest).toHaveBeenCalledWith(
            expect.anything(),
            "sign-up/email",
            JSON.stringify({ name: "User", email: "user@example.test", password: "secret123" }),
        );
    });

    it("redirects signup errors back to the form instead of exposing the API route", async () => {
        proxyAuthRequest.mockResolvedValue(
            new Response(JSON.stringify({ code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" }), { status: 422 }),
        );
        const request = new Request("https://erp.test/api/auth/signup", {
            method: "POST",
            body: new URLSearchParams({ name: "User", email: "user@example.test", password: "secret123" }),
        });

        const response = await signUp(context(request));

        expect(response.status).toBe(303);
        expect(response.headers.get("location")).toBe("/signup?error=account_exists");
    });

    it("redirects direct visits to the signup endpoint to the form", async () => {
        const response = await signUpGet(context(new Request("https://erp.test/api/auth/signup")));
        expect(response.status).toBe(302);
        expect(response.headers.get("location")).toBe("/signup");
    });
});
