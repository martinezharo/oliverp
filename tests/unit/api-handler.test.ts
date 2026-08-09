import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { BackendClient } from "../../src/lib/convex";

const resolvePrincipal = vi.fn();
const requireScope = vi.fn();
vi.mock("../../src/lib/api/auth", () => ({
    resolvePrincipal: (...args: unknown[]) => resolvePrincipal(...args),
    requireScope: (...args: unknown[]) => requireScope(...args),
}));

const { ApiError } = await import("../../src/lib/api/errors");
const { apiHandler, json, parseBody, parseQuery, withIdempotency } = await import(
    "../../src/lib/api/handler"
);

const ENDPOINT = "POST /api/v1/ventas";

function context(headers: Record<string, string> = {}) {
    return {
        request: new Request("https://example.test/api/v1/ventas", { method: "POST", headers }),
        locals: {} as App.Locals,
    } as never;
}

function backendWithReservations() {
    const records = new Map<string, { requestHash: string; responseStatus: number; responseBody: unknown }>();
    return {
        records,
        reserveIdempotency: vi.fn(async (key: string, endpoint: string, requestHash: string) => {
            const storageKey = `${key}:${endpoint}`;
            const existing = records.get(storageKey);
            if (!existing) {
                records.set(storageKey, { requestHash, responseStatus: 0, responseBody: {} });
                return { status: "reserved" as const };
            }
            if (existing.requestHash !== requestHash) return { status: "mismatch" as const };
            if (existing.responseStatus === 0) return { status: "in_flight" as const };
            return {
                status: "replay" as const,
                responseStatus: existing.responseStatus,
                responseBody: existing.responseBody,
            };
        }),
        completeIdempotency: vi.fn(async (key: string, endpoint: string, status: number, body: unknown) => {
            const record = records.get(`${key}:${endpoint}`);
            if (record) {
                record.responseStatus = status;
                record.responseBody = body;
            }
        }),
        releaseIdempotency: vi.fn(async (key: string, endpoint: string) => {
            records.delete(`${key}:${endpoint}`);
        }),
    };
}

function principalWith(backend = backendWithReservations()) {
    const typedBackend = backend as unknown as BackendClient;
    return {
        backend,
        principal: {
            kind: "api_key" as const,
            scopes: ["write" as const],
            projectId: 7,
            apiKeyId: "key-1",
            idempotencyNamespace: "api-key:key-1",
            backend: typedBackend,
        },
    };
}

const ok = async () => json({ id: 42 }, 201);

beforeEach(() => {
    resolvePrincipal.mockReset();
    requireScope.mockReset();
});

describe("withIdempotency", () => {
    it("runs without touching Convex when no key is supplied", async () => {
        const { principal, backend } = principalWith();
        const fn = vi.fn(ok);
        const response = await withIdempotency(context(), principal, ENDPOINT, { a: 1 }, fn);

        expect(response.status).toBe(201);
        expect(fn).toHaveBeenCalledOnce();
        expect(backend.reserveIdempotency).not.toHaveBeenCalled();
    });

    it("reserves, completes and replays a successful request", async () => {
        const { principal, backend } = principalWith();
        const request = context({ "idempotency-key": "k1" });

        await expect(withIdempotency(request, principal, ENDPOINT, { a: 1 }, ok)).resolves.toHaveProperty("status", 201);
        expect(backend.reserveIdempotency).toHaveBeenCalledOnce();
        expect(backend.completeIdempotency).toHaveBeenCalledOnce();

        const fn = vi.fn(ok);
        const replay = await withIdempotency(request, principal, ENDPOINT, { a: 1 }, fn);
        expect(replay.status).toBe(201);
        expect(replay.headers.get("Idempotency-Replayed")).toBe("true");
        expect(fn).not.toHaveBeenCalled();
    });

    it("rejects a different body and an in-flight duplicate", async () => {
        const { principal } = principalWith();
        const request = context({ "idempotency-key": "k1" });
        const pending = backendWithReservations();
        const pendingPrincipal = principalWith(pending).principal;

        await withIdempotency(request, principal, ENDPOINT, { a: 1 }, ok);
        await expect(withIdempotency(request, principal, ENDPOINT, { a: 2 }, ok)).rejects.toMatchObject({
            code: "idempotency_mismatch",
        });
        pending.reserveIdempotency.mockResolvedValueOnce({ status: "in_flight" });
        await expect(withIdempotency(context({ "idempotency-key": "pending" }), pendingPrincipal, ENDPOINT, { a: 1 }, ok))
            .rejects.toMatchObject({ code: "conflict" });
    });

    it("releases a reservation when the handler fails or returns an error", async () => {
        const { principal, backend } = principalWith();
        await expect(withIdempotency(context({ "idempotency-key": "throw" }), principal, ENDPOINT, {}, async () => {
            throw new ApiError("validation_error", "boom");
        })).rejects.toMatchObject({ code: "validation_error" });
        expect(backend.releaseIdempotency).toHaveBeenCalledOnce();

        const response = await withIdempotency(context({ "idempotency-key": "bad" }), principal, ENDPOINT, {}, async () =>
            json({ error: "nope" }, 400),
        );
        expect(response.status).toBe(400);
        expect(backend.releaseIdempotency).toHaveBeenCalledTimes(2);
        expect(backend.completeIdempotency).toHaveBeenCalledTimes(0);
    });

    it("rejects oversized keys before reserving storage", async () => {
        const { principal, backend } = principalWith();
        await expect(withIdempotency(context({ "idempotency-key": "x".repeat(256) }), principal, ENDPOINT, {}, ok))
            .rejects.toMatchObject({ code: "validation_error" });
        expect(backend.reserveIdempotency).not.toHaveBeenCalled();
    });
});

describe("apiHandler", () => {
    const { principal } = principalWith();

    it("resolves the caller and checks the scope before the route", async () => {
        resolvePrincipal.mockResolvedValue(principal);
        const fn = vi.fn(async () => json({ ok: true }));
        const response = await apiHandler(context(), "read", fn);

        expect(requireScope).toHaveBeenCalledWith(principal, "read");
        expect(fn).toHaveBeenCalledWith(principal);
        expect(response.status).toBe(200);
    });

    it("converts authentication, scope and unexpected errors", async () => {
        resolvePrincipal.mockRejectedValueOnce(new ApiError("unauthorized", "no"));
        expect((await apiHandler(context(), "read", vi.fn())).status).toBe(401);

        resolvePrincipal.mockResolvedValue(principal);
        requireScope.mockImplementation(() => {
            throw new ApiError("forbidden", "no");
        });
        expect((await apiHandler(context(), "write", vi.fn())).status).toBe(403);

        requireScope.mockReset();
        vi.spyOn(console, "error").mockImplementation(() => {});
        const response = await apiHandler(context(), "read", async () => {
            throw new TypeError("boom");
        });
        expect(response.status).toBe(500);
    });
});

describe("request parsing", () => {
    it("parses validated JSON and query strings", async () => {
        const parsed = await parseBody(
            new Request("https://example.test", { method: "POST", body: JSON.stringify({ id: 3 }) }),
            z.object({ id: z.number() }),
        );
        expect(parsed).toEqual({ id: 3 });
        expect(parseQuery(new URL("https://example.test?projectId=7"), z.object({ projectId: z.string() })))
            .toEqual({ projectId: "7" });
    });
});
