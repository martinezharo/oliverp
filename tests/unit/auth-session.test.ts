import { beforeEach, describe, expect, it, vi } from "vitest";

const getToken = vi.fn();
const query = vi.fn();
const setAuth = vi.fn();

vi.mock("@convex-dev/better-auth/utils", () => ({
    getToken: (...args: unknown[]) => getToken(...args),
}));
vi.mock("convex/browser", () => ({
    ConvexHttpClient: class {
        setAuth = setAuth;
        query = query;
    },
}));
vi.mock("../../src/lib/runtime", () => ({
    convexAppUrl: () => "https://deployment.convex.cloud",
    convexSiteUrl: () => "https://deployment.convex.site",
}));

const { getAuthSession } = await import("../../src/lib/auth");

function context() {
    return {
        request: new Request("https://erp.test/", {
            headers: { cookie: "better-auth.session_token=session" },
        }),
        locals: {},
    } as never;
}

beforeEach(() => {
    getToken.mockReset();
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
        getToken.mockResolvedValue({ token: "jwt" });
        query.mockResolvedValue(user);

        await expect(getAuthSession(context())).resolves.toEqual({ user, token: "jwt" });
        expect(setAuth).toHaveBeenCalledWith("jwt");
    });

    it("treats a rejected JWT as an invalid session instead of throwing a 500", async () => {
        getToken.mockResolvedValue({ token: "jwt" });
        query.mockRejectedValue(new Error("NoAuthProvider"));

        await expect(getAuthSession(context())).resolves.toBeNull();
    });

    it("treats an unavailable token endpoint as an invalid session", async () => {
        getToken.mockRejectedValue(new Error("Auth endpoint unavailable"));

        await expect(getAuthSession(context())).resolves.toBeNull();
    });
});
