import { createBackend, type BackendClient } from "./convex";
import { fromConvexError, ApiError } from "./api/errors";
import { isDemoMode } from "./runtime";
import { getAuthSession } from "./auth";
import type { ServerContext } from "./server-context";

export function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

/** Accepts the string ids emitted by HTML dataset attributes and JSON ids. */
export function parsePositiveInteger(value: unknown): number | null {
    const parsed =
        typeof value === "number"
            ? value
            : typeof value === "string" && value.trim() !== ""
              ? Number(value)
              : Number.NaN;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function demoResponse(context: ServerContext, emptyBody: unknown = null): Response {
    if (emptyBody !== null) return jsonResponse(emptyBody);
    const translate = context.locals.t;
    const message = typeof translate === "function"
        ? translate("api.demoUnavailable")
        : "Not available in demo mode";
    return jsonResponse({ error: message }, 403);
}

/** Returns the authenticated user's Convex gateway, or null for a 401. */
export async function sessionBackend(
    context: ServerContext,
): Promise<{ backend: BackendClient; userId: string } | null> {
    if (isDemoMode(context.locals)) return null;

    const session = context.locals.user
        ? { user: context.locals.user, token: context.locals.authToken ?? "" }
        : await getAuthSession(context);
    const user = session?.user;
    if (!user) return null;

    return {
        backend: createBackend(context.locals, {
            kind: "session",
            userId: user.id,
        }, session?.token || context.locals.authToken),
        userId: user.id,
    };
}

export function unauthorizedResponse(): Response {
    return jsonResponse({ error: "Unauthorized" }, 401);
}

export function backendError(error: unknown): Response {
    if (error instanceof ApiError) return error.toResponse();
    const convexError = fromConvexError(error);
    if (convexError) return convexError.toResponse();
    return jsonResponse({ error: error instanceof Error ? error.message : "Internal server error" }, 500);
}
