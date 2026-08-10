import type { APIRoute } from "@/lib/server-context";
import { backendError, jsonResponse, sessionBackend, unauthorizedResponse } from "../../../lib/legacy-api";
import { isDemoMode } from "../../../lib/runtime";

export const GET: APIRoute = async (context) => {
    const projectId = Number(context.url.searchParams.get("projectId"));
    if (!Number.isInteger(projectId) || projectId <= 0) {
        return jsonResponse({ error: "Project ID is required" }, 400);
    }

    if (isDemoMode(context.locals)) {
        return jsonResponse({ concepts: [] });
    }

    const session = await sessionBackend(context);
    if (!session) return unauthorizedResponse();

    try {
        const result = await session.backend.listTransactions({
            projectId,
            page: 1,
            pageSize: 1000,
        });
        const concepts = [...new Set(
            result.data
                .map((row) => String(row.concepto ?? "").trim())
                .filter(Boolean),
        )].sort((a, b) => a.localeCompare(b));
        return jsonResponse({ concepts });
    } catch (error) {
        return backendError(error);
    }
};
