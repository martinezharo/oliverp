import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ServerContext } from "../../src/lib/server-context";

const query = vi.fn();
const setAuth = vi.fn();

vi.mock("convex/browser", () => ({
    ConvexHttpClient: class {
        setAuth = setAuth;
        query = query;
    },
}));
vi.mock("../../src/lib/runtime", () => ({
    convexAppUrl: () => "https://deployment.convex.cloud",
}));

const { getAuthSession } = await import("../../src/lib/auth");

function context(): ServerContext {
    const request = new Request("https://erp.test/", {
        headers: { authorization: "Bearer jwt" },
    });
    return {
        request,
        url: new URL(request.url),
        params: {},
        locals: {},
        cookies: {
            get: () => undefined,
            set: () => undefined,
            delete: () => undefined,
        },
        redirect: (path, status = 302) => Response.redirect(new URL(path, request.url), status),
    };
}

beforeEach(() => {
    query.mockReset();
    setAuth.mockReset();
});

describe("getAuthSession", () => {
    it("returns the validated user and Convex token", async () => {
        const user = {
            id: "user-1",
            tokenIdentifier: "issuer|user-1",
            email: "user@example.test",
            name: "User",
        };
        query.mockResolvedValue(user);

        await expect(getAuthSession(context())).resolves.toEqual({ user, token: "jwt" });
        expect(setAuth).toHaveBeenCalledWith("jwt");
    });

    it("treats a rejected JWT as an invalid session instead of throwing a 500", async () => {
        query.mockRejectedValue(new Error("NoAuthProvider"));

        await expect(getAuthSession(context())).resolves.toBeNull();
    });

    it("treats a missing bearer token as an invalid session", async () => {
        const request = new Request("https://erp.test/");

        await expect(getAuthSession({ ...context(), request })).resolves.toBeNull();
    });
});
