import type { APIRoute } from "@/lib/server-context";
import {
    backendError,
    demoResponse,
    jsonResponse,
    sessionBackend,
    unauthorizedResponse,
} from "../../../lib/legacy-api";
import { isDemoMode } from "../../../lib/runtime";

/** Same budgeted loop as project deletion; see that route for the reasoning. */
const MAX_ROUNDS = 400;

export const POST: APIRoute = async (context) => {
    if (isDemoMode(context.locals)) return demoResponse(context);

    const session = await sessionBackend(context);
    if (!session) return unauthorizedResponse();

    try {
        for (let round = 0; round < MAX_ROUNDS; round += 1) {
            const result = await session.backend.deleteAccount();
            if (result.done) return jsonResponse({ success: true });
        }

        return jsonResponse({ success: false, pending: true }, 202);
    } catch (error) {
        return backendError(error);
    }
};
