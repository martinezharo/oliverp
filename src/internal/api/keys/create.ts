import type { APIRoute } from "@/lib/server-context";
import { SCOPES, generateApiKey, hashApiKey, type Scope } from "@/lib/api/keys";
import {
    backendError,
    demoResponse,
    jsonResponse,
    parsePositiveInteger,
    sessionBackend,
    unauthorizedResponse,
} from "../../../lib/legacy-api";
import { isDemoMode } from "../../../lib/runtime";

/** Long enough to describe an integration, short enough to render in a row. */
const MAX_NAME = 60;

function parseScopes(value: unknown): Scope[] | null {
    if (!Array.isArray(value) || value.length === 0) return null;
    const scopes = [...new Set(value)];
    if (!scopes.every((scope): scope is Scope => SCOPES.includes(scope as Scope))) return null;
    // `write` without `read` would be a key that can create a sale but not read
    // it back; the UI never offers it, and normalising here keeps a hand-made
    // request from producing one either.
    return scopes.includes("write") ? ["read", "write"] : ["read"];
}

/**
 * Mints a key for a project the caller administers.
 *
 * The secret is generated here rather than in the browser so it exists on the
 * wire exactly once, in this response: only its hash reaches Convex, and
 * nothing can show it again afterwards.
 */
export const POST: APIRoute = async (context) => {
    if (isDemoMode(context.locals)) return demoResponse(context);

    const session = await sessionBackend(context);
    if (!session) return unauthorizedResponse();

    try {
        const body = (await context.request.json()) as {
            projectId?: unknown;
            name?: unknown;
            scopes?: unknown;
            expiresAt?: unknown;
        };

        const projectId = parsePositiveInteger(body.projectId);
        if (projectId === null) return jsonResponse({ error: "Missing projectId" }, 400);

        const name = typeof body.name === "string" ? body.name.trim() : "";
        if (!name || name.length > MAX_NAME) {
            return jsonResponse({ error: "Invalid name" }, 400);
        }

        const scopes = parseScopes(body.scopes);
        if (!scopes) return jsonResponse({ error: "Invalid scopes" }, 400);

        let expiresAt: string | undefined;
        if (typeof body.expiresAt === "string" && body.expiresAt.trim() !== "") {
            const parsed = new Date(body.expiresAt);
            if (Number.isNaN(parsed.getTime())) {
                return jsonResponse({ error: "Invalid expiresAt" }, 400);
            }
            expiresAt = parsed.toISOString();
        }

        const { key, prefix } = generateApiKey();
        const data = await session.backend.createApiKey({
            name,
            projectId,
            keyHash: await hashApiKey(key),
            keyPrefix: prefix,
            scopes,
            ...(expiresAt ? { expiresAt } : {}),
        });

        return jsonResponse({ success: true, data: { ...data, key } });
    } catch (error) {
        return backendError(error);
    }
};
