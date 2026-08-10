import type { APIRoute } from "@/lib/server-context";
import {
    backendError,
    demoResponse,
    jsonResponse,
    parsePositiveInteger,
    sessionBackend,
    unauthorizedResponse,
} from "../../../lib/legacy-api";
import { isDemoMode } from "../../../lib/runtime";

/**
 * Deletion is budgeted per call so one transaction never exceeds Convex's
 * write limit. The loop lives here rather than in the browser so a user who
 * closes the tab mid-delete does not leave a half-erased project behind, and so
 * the client sees a single request either succeed or fail.
 *
 * The cap is a safety net: at 1000 documents per round it covers projects up to
 * a few hundred thousand rows, and a project larger than that returns 202 so
 * the caller can simply ask again.
 */
const MAX_ROUNDS = 200;

export const POST: APIRoute = async (context) => {
    if (isDemoMode(context.locals)) return demoResponse(context);

    const session = await sessionBackend(context);
    if (!session) return unauthorizedResponse();

    try {
        const body = (await context.request.json()) as { projectId?: unknown };
        const projectId = parsePositiveInteger(body.projectId);
        if (projectId === null) return jsonResponse({ error: "Missing projectId" }, 400);

        for (let round = 0; round < MAX_ROUNDS; round += 1) {
            const result = await session.backend.deleteProject(projectId);
            if (result.done) return jsonResponse({ success: true });
        }

        return jsonResponse({ success: false, pending: true }, 202);
    } catch (error) {
        return backendError(error);
    }
};
