import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ServerLocals } from "../../src/lib/server-context";

const demo = { active: false };
const getAuthSession = vi.fn();
const createBackend = vi.fn();

vi.mock("../../src/lib/runtime", () => ({
    isDemoMode: () => demo.active,
}));
vi.mock("../../src/lib/auth", () => ({ getAuthSession: (...args: unknown[]) => getAuthSession(...args) }));
vi.mock("../../src/lib/convex", () => ({ createBackend: (...args: unknown[]) => createBackend(...args) }));

const { ApiError } = await import("../../src/lib/api/errors");
const { assertProjectAccess, requireScope, resolvePrincipal, resolveProjectId } = await import(
    "../../src/lib/api/auth"
);
const { hashApiKey } = await import("../../src/lib/api/keys");

interface StoredKey {
    id?: string;
    proyecto_id?: number | null;
    scopes?: string[] | null;
    activa?: boolean;
    expira_en?: string | null;
    ultimo_uso_en?: string | null;
}

function context(headers: Record<string, string> = {}) {
    return {
        request: new Request("https://example.test/api/v1/ventas", { headers }),
        locals: {} as ServerLocals,
    } as never;
}

function setupLookup(row: StoredKey | null) {
    const lookup = {
        apiKeyByHash: vi.fn(async () => row),
        touchApiKey: vi.fn(async () => undefined),
    };
    const backend = { kind: "backend" };
    createBackend.mockReset();
    createBackend.mockReturnValueOnce(lookup).mockReturnValueOnce(backend);
    return { lookup, backend };
}

async function expectApiError(promise: Promise<unknown>, code: string) {
    const error = await promise.then(() => null, (value: unknown) => value);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as InstanceType<typeof ApiError>).code).toBe(code);
    return error as InstanceType<typeof ApiError>;
}

beforeEach(() => {
    demo.active = false;
    getAuthSession.mockReset();
    createBackend.mockReset();
});

afterEach(() => vi.useRealTimers());

describe("resolvePrincipal — Convex API keys", () => {
    it("rejects every request in demo mode", async () => {
        demo.active = true;
        await expectApiError(resolvePrincipal(context({ authorization: "Bearer erp_sk_valid" })), "demo_mode");
        await expectApiError(resolvePrincipal(context()), "demo_mode");
        expect(createBackend).not.toHaveBeenCalled();
    });

    it("looks up the hash in Convex without exposing the plaintext key", async () => {
        const { lookup } = setupLookup({ id: "k1", proyecto_id: 7, scopes: ["read"], activa: true });
        const principal = await resolvePrincipal(context({ authorization: "Bearer erp_sk_secret" }));

        expect(lookup.apiKeyByHash).toHaveBeenCalledWith(await hashApiKey("erp_sk_secret"));
        expect(principal).toMatchObject({ kind: "api_key", projectId: 7, apiKeyId: "k1" });
        expect(JSON.stringify(lookup.apiKeyByHash.mock.calls)).not.toContain("erp_sk_secret");
    });

    it("keeps unknown, revoked and expired keys indistinguishable", async () => {
        const yesterday = new Date(Date.now() - 86_400_000).toISOString();
        const rows: Array<StoredKey | null> = [
            null,
            { id: "k1", scopes: ["read"], activa: false },
            { id: "k1", scopes: ["read"], activa: true, expira_en: yesterday },
        ];
        const responses = new Set<string>();
        for (const row of rows) {
            setupLookup(row);
            const error = await expectApiError(
                resolvePrincipal(context({ authorization: "Bearer erp_sk_secret" })),
                "unauthorized",
            );
            responses.add(`${error.status}:${error.message}`);
        }
        expect(responses.size).toBe(1);
    });

    it("touches a stale key but not a recently used one", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));

        const fresh = setupLookup({ id: "k1", scopes: ["read"], activa: true, ultimo_uso_en: "2026-01-01T11:59:30Z" });
        await resolvePrincipal(context({ "x-api-key": "erp_sk_secret" }));
        expect(fresh.lookup.touchApiKey).not.toHaveBeenCalled();

        const stale = setupLookup({ id: "k1", scopes: ["read"], activa: true, ultimo_uso_en: "2026-01-01T11:00:00Z" });
        await resolvePrincipal(context({ "x-api-key": "erp_sk_secret" }));
        expect(stale.lookup.touchApiKey).toHaveBeenCalledWith("k1", "2026-01-01T12:00:00.000Z");
    });
});

describe("resolvePrincipal — Convex Auth session", () => {
    it("uses a Convex bearer token as a session instead of an API key", async () => {
        const backend = { kind: "backend" };
        createBackend.mockReturnValue(backend);
        getAuthSession.mockResolvedValue({
            token: "convex-jwt",
            user: { id: "user-1", tokenIdentifier: "issuer|user-1", email: "user@example.test", name: "User" },
        });

        const principal = await resolvePrincipal(context({ authorization: "Bearer convex-jwt" }));

        expect(principal.kind).toBe("session");
        expect(getAuthSession).toHaveBeenCalled();
        expect(createBackend).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ kind: "api_key" }));
    });

    it("rejects a request without a valid Convex session", async () => {
        getAuthSession.mockResolvedValue(null);
        await expectApiError(resolvePrincipal(context()), "unauthorized");
    });

    it("passes the Convex JWT and token identifier to the data gateway", async () => {
        const backend = { kind: "backend" };
        createBackend.mockReturnValue(backend);
        getAuthSession.mockResolvedValue({
            token: "convex-jwt",
            user: { id: "user-1", tokenIdentifier: "issuer|user-1", email: "user@example.test", name: "User" },
        });
        const principal = await resolvePrincipal(context());

        expect(principal).toMatchObject({
            kind: "session",
            scopes: ["read", "write"],
            idempotencyNamespace: "session:user-1",
        });
        expect(createBackend).toHaveBeenLastCalledWith(
            expect.anything(),
            { kind: "session", userId: "user-1" },
            "convex-jwt",
        );
    });
});

describe("project authorization helpers", () => {
    const backend = { kind: "backend" } as never;
    const readOnly = { kind: "api_key" as const, scopes: ["read" as const], projectId: 1, apiKeyId: "k", idempotencyNamespace: "api-key:k", backend };
    const pinned = { ...readOnly, scopes: ["write" as const], projectId: 7 };
    const unpinned = { ...pinned, projectId: null };

    it("enforces scopes and project pins", () => {
        expect(() => requireScope(readOnly, "read")).not.toThrow();
        expect(() => requireScope(readOnly, "write")).toThrow(ApiError);
        expect(resolveProjectId(pinned, undefined)).toBe(7);
        expect(resolveProjectId(pinned, 7)).toBe(7);
        expect(() => resolveProjectId(pinned, 8)).toThrow(ApiError);
        expect(() => resolveProjectId(unpinned, undefined)).toThrow(ApiError);
        expect(resolveProjectId(unpinned, 0)).toBe(0);
    });

    it("returns 404 semantics for a resource outside a pinned key", () => {
        expect(() => assertProjectAccess(pinned, 7)).not.toThrow();
        expect(() => assertProjectAccess({ ...pinned, projectId: null }, 42)).not.toThrow();
        try {
            assertProjectAccess(pinned, 8);
            expect.unreachable("cross-project access must fail");
        } catch (error) {
            expect((error as InstanceType<typeof ApiError>).code).toBe("not_found");
            expect((error as InstanceType<typeof ApiError>).status).toBe(404);
        }
    });
});
