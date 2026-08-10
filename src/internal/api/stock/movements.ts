import type { APIRoute } from "@/lib/server-context";
import { backendError, jsonResponse, sessionBackend, unauthorizedResponse } from "../../../lib/legacy-api";
import { isDemoMode } from "../../../lib/runtime";

export const GET: APIRoute = async (context) => {
    if (isDemoMode(context.locals)) return jsonResponse({ data: [] });
    const session = await sessionBackend(context);
    if (!session) return unauthorizedResponse();

    const productId = Number(context.url.searchParams.get("productId"));
    // Product ids are unique per project, so the project is part of the address
    // of a product rather than something the backend can infer from the id.
    const projectId = Number(context.url.searchParams.get("projectId"));
    if (!Number.isInteger(productId) || productId <= 0) {
        return jsonResponse({ error: "Missing productId" }, 400);
    }
    if (!Number.isInteger(projectId) || projectId <= 0) {
        return jsonResponse({ error: "Missing projectId" }, 400);
    }

    try {
        const product = await session.backend.getProductGlobal(projectId, productId);
        if (!product) return jsonResponse({ error: "Product not found" }, 404);
        const data = await session.backend.listStockMovements(product.proyecto_id, productId);
        return jsonResponse({ data });
    } catch (error) {
        return backendError(error);
    }
};
