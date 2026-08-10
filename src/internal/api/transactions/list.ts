import type { APIRoute } from "@/lib/server-context";
import { backendError, jsonResponse, sessionBackend, unauthorizedResponse } from "../../../lib/legacy-api";
import { isDemoMode } from "../../../lib/runtime";
import { filterTransactions, normalizeTransactions } from "../../../lib/transactions";

function optionalAmount(value: string | null): number | undefined {
    if (value === null || value.trim() === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

export const GET: APIRoute = async (context) => {
    if (isDemoMode(context.locals)) return jsonResponse({ items: [], total: 0, page: 1, pageSize: 20 });
    const session = await sessionBackend(context);
    if (!session) return unauthorizedResponse();

    const projectId = Number(context.url.searchParams.get("projectId"));
    if (!Number.isInteger(projectId) || projectId <= 0) return jsonResponse({ error: "Missing projectId" }, 400);

    const dateFrom = context.url.searchParams.get("dateFrom") || undefined;
    const dateTo = context.url.searchParams.get("dateTo") || undefined;
    const page = Math.max(1, Number.parseInt(context.url.searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(context.url.searchParams.get("pageSize") || "20", 10)));

    try {
        const sources = await session.backend.transactionSources({ projectId, fromDate: dateFrom, toDate: dateTo ? `${dateTo}T23:59:59` : undefined });
        const filtered = filterTransactions(normalizeTransactions(sources), {
            type: context.url.searchParams.get("type") || "",
            search: context.url.searchParams.get("search") || "",
            channel: context.url.searchParams.get("channel") || "",
            amountMin: optionalAmount(context.url.searchParams.get("amountMin")),
            amountMax: optionalAmount(context.url.searchParams.get("amountMax")),
        });

        const total = filtered.length;
        const from = (page - 1) * pageSize;
        return jsonResponse({ items: filtered.slice(from, from + pageSize), total, page, pageSize });
    } catch (error) {
        return backendError(error);
    }
};
