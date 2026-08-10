import type { APIRoute } from "@/lib/server-context";
import { backendError, jsonResponse, sessionBackend, unauthorizedResponse } from "../../../lib/legacy-api";
import { isDemoMode } from "../../../lib/runtime";
import { normalizeTransactions } from "../../../lib/transactions";

export const GET: APIRoute = async (context) => {
    if (isDemoMode(context.locals)) return jsonResponse([]);
    const session = await sessionBackend(context);
    if (!session) return unauthorizedResponse();

    const date = context.url.searchParams.get("date");
    const projectId = Number(context.url.searchParams.get("projectId"));
    if (!date || !Number.isInteger(projectId) || projectId <= 0) {
        return jsonResponse({ error: "Missing date or projectId" }, 400);
    }

    try {
        const sources = await session.backend.transactionSources({
            projectId,
            fromDate: date,
            toDate: `${date}T23:59:59`,
        });
        // A single day, so the shared date ordering is irrelevant here: the
        // original endpoint listed the newest entry of the day first.
        const normalized = normalizeTransactions(sources).sort((a, b) => b.id - a.id);
        return jsonResponse(normalized);
    } catch (error) {
        return backendError(error);
    }
};
