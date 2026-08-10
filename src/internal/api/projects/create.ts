import type { APIRoute } from "@/lib/server-context";
import { backendError, demoResponse, jsonResponse, sessionBackend, unauthorizedResponse } from "../../../lib/legacy-api";
import { isDemoMode } from "../../../lib/runtime";

export const POST: APIRoute = async (context) => {
    if (isDemoMode(context.locals)) return demoResponse(context);

    const session = await sessionBackend(context);
    if (!session) return unauthorizedResponse();

    try {
        const body = await context.request.json() as { name?: string };
        const name = body.name?.trim();
        if (!name) return jsonResponse({ error: "Missing required fields" }, 400);
        const data = await session.backend.createProject(name);
        return jsonResponse({ success: true, data });
    } catch (error) {
        return backendError(error);
    }
};
