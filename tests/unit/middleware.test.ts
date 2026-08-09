import { beforeEach, describe, expect, it, vi } from "vitest";

const demo = { active: false };
const getAuthSession = vi.fn();

vi.mock("../../src/lib/runtime", () => ({
    DEMO_MODE_COOKIE: "erp_demo_mode",
    isDemoMode: () => demo.active,
}));
vi.mock("../../src/lib/auth", () => ({ getAuthSession: (...args: unknown[]) => getAuthSession(...args) }));

const { onRequest } = await import("../../src/middleware");

const NEXT = new Response("page", { status: 200 });
const REDIRECT = new Response(null, { status: 302, headers: { Location: "/login" } });

async function run(pathname: string) {
    const deleted: Array<[string, unknown]> = [];
    const locals: Record<string, unknown> = {};
    const next = vi.fn(async () => NEXT);
    const redirect = vi.fn(() => REDIRECT);
    const response = await onRequest(
        {
            request: new Request(`https://erp.test${pathname}`, {
                headers: { "accept-language": "es-ES" },
            }),
            locals,
            redirect,
            cookies: {
                get: () => undefined,
                delete: (name: string, options: unknown) => deleted.push([name, options]),
            },
        } as never,
        next as never,
    );
    return { response: response as Response, locals, deleted, next, redirect };
}

beforeEach(() => {
    demo.active = false;
    getAuthSession.mockReset();
});

describe("middleware", () => {
    it("always resolves locale metadata", async () => {
        getAuthSession.mockResolvedValue(null);
        const { locals } = await run("/api/sales/create");
        expect(locals.lang).toBe("es");
        expect(typeof locals.t).toBe("function");
    });

    it("skips authentication in Convex demo mode", async () => {
        demo.active = true;
        const { next, response } = await run("/api/sales/create");
        expect(next).toHaveBeenCalledOnce();
        expect(response.status).toBe(200);
        expect(getAuthSession).not.toHaveBeenCalled();
    });

    it("leaves login, auth and API-key routes public to the middleware", async () => {
        for (const path of ["/login", "/signup", "/api/auth/signin", "/api/auth/get-session", "/api/v1/ventas"]) {
            const { next } = await run(path);
            expect(next, path).toHaveBeenCalledOnce();
        }
        expect(getAuthSession).not.toHaveBeenCalled();
    });

    it("returns JSON 401 for an anonymous browser API request", async () => {
        getAuthSession.mockResolvedValue(null);
        const { response, next, redirect } = await run("/api/sales/create");
        expect(next).not.toHaveBeenCalled();
        expect(redirect).not.toHaveBeenCalled();
        expect(response.status).toBe(401);
    });

    it("redirects an anonymous page request and clears stale auth cookies", async () => {
        getAuthSession.mockResolvedValue(null);
        const { response, next, redirect, deleted } = await run("/transacciones");
        expect(next).not.toHaveBeenCalled();
        expect(redirect).toHaveBeenCalledWith("/login");
        expect(response.status).toBe(302);
        expect(deleted).toEqual([
            ["better-auth.session_token", { path: "/" }],
            ["__Secure-better-auth.session_token", { path: "/" }],
            ["convex_jwt", { path: "/" }],
            ["better-auth.convex_jwt", { path: "/" }],
            ["__Secure-convex_jwt", { path: "/" }],
            ["__Secure-better-auth.convex_jwt", { path: "/" }],
        ]);
    });

    it("attaches the validated Better Auth user and Convex JWT", async () => {
        const user = {
            id: "user-1",
            tokenIdentifier: "issuer|user-1",
            email: "user@example.test",
            name: "User",
        };
        getAuthSession.mockResolvedValue({ user, token: "jwt" });
        const { next, locals } = await run("/");
        expect(next).toHaveBeenCalledOnce();
        expect(locals.user).toEqual(user);
        expect(locals.authToken).toBe("jwt");
    });
});
