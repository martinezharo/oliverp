import type { APIRoute } from "@/lib/server-context";
import { backendError, demoResponse, jsonResponse, sessionBackend, unauthorizedResponse } from "../../../lib/legacy-api";
import { isDemoMode } from "../../../lib/runtime";

export const GET: APIRoute = async (context) => {
    if (isDemoMode(context.locals)) return demoResponse(context);
    const session = await sessionBackend(context);
    if (!session) return unauthorizedResponse();

    const id = Number(context.url.searchParams.get("id"));
    const projectId = Number(context.url.searchParams.get("projectId"));
    if (!Number.isInteger(id) || id <= 0) return jsonResponse({ error: "Missing id" }, 400);
    if (!Number.isInteger(projectId) || projectId <= 0) {
        return jsonResponse({ error: "Missing projectId" }, 400);
    }

    try {
        const data = await session.backend.getPurchase(projectId, id);
        if (!data) return jsonResponse({ error: "Purchase not found" }, 404);
        return jsonResponse(data);
    } catch (error) {
        return backendError(error);
    }
};
