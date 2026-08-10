import type { APIRoute } from "@/lib/server-context";
import { backendError, jsonResponse, sessionBackend, unauthorizedResponse } from "../../../lib/legacy-api";
import { isDemoMode } from "../../../lib/runtime";

export const GET: APIRoute = async (context) => {
    if (isDemoMode(context.locals)) return jsonResponse({ data: [] });
    const session = await sessionBackend(context);
    if (!session) return unauthorizedResponse();

    const productId = Number(context.url.searchParams.get("productId"));
    if (!Number.isInteger(productId) || productId <= 0) {
        return jsonResponse({ error: "Missing productId" }, 400);
    }

    try {
        const product = await session.backend.getProductGlobal(productId);
        if (!product) return jsonResponse({ error: "Product not found" }, 404);
        const data = await session.backend.listStockMovements(product.proyecto_id, productId);
        return jsonResponse({ data });
    } catch (error) {
        return backendError(error);
    }
};
