import type { APIRoute } from "@/lib/server-context";
import {
    backendError,
    demoResponse,
    jsonResponse,
    sessionBackend,
    unauthorizedResponse,
} from "../../../lib/legacy-api";
import { isDemoMode } from "../../../lib/runtime";

/** Withdraws a key. Convex checks the caller administers the key's project. */
export const POST: APIRoute = async (context) => {
    if (isDemoMode(context.locals)) return demoResponse(context);

    const session = await sessionBackend(context);
    if (!session) return unauthorizedResponse();

    try {
        const body = (await context.request.json()) as { keyId?: unknown };
        const keyId = typeof body.keyId === "string" ? body.keyId.trim() : "";
        if (!keyId) return jsonResponse({ error: "Missing keyId" }, 400);

        const data = await session.backend.revokeApiKey(keyId);
        return jsonResponse({ success: true, data });
    } catch (error) {
        return backendError(error);
    }
};
