import type { APIRoute } from "@/lib/server-context";
import { backendError, demoResponse, jsonResponse, sessionBackend, unauthorizedResponse } from "../../../lib/legacy-api";
import { isDemoMode } from "../../../lib/runtime";

export const DELETE: APIRoute = async (context) => {
    if (isDemoMode(context.locals)) return demoResponse(context);
    const session = await sessionBackend(context);
    if (!session) return unauthorizedResponse();

    const id = Number(context.url.searchParams.get("id"));
    const type = context.url.searchParams.get("type");
    if (!Number.isInteger(id) || id <= 0 || !type) {
        return jsonResponse({ error: "Missing id or type" }, 400);
    }

    try {
        let deleted = false;
        if (type === "venta") deleted = await session.backend.deleteSale(id);
        else if (type === "compra") deleted = await session.backend.deletePurchase(id);
        else if (type === "gasto" || type === "ingreso") deleted = await session.backend.deleteTransaction(id);
        else return jsonResponse({ error: "Invalid type" }, 400);

        return jsonResponse({ success: deleted });
    } catch (error) {
        return backendError(error);
    }
};
