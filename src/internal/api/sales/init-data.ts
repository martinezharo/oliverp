import type { APIRoute } from "@/lib/server-context";
import { mockStock } from "../../../lib/mock-data";
import { backendError, jsonResponse, parsePositiveInteger, sessionBackend, unauthorizedResponse } from "../../../lib/legacy-api";
import { isDemoMode } from "../../../lib/runtime";

/**
 * Channels are learned from past sales, so a project that has never sold
 * anything would offer none and its first sale could not be recorded. These
 * are the starting points; the form also accepts a new name.
 */
const DEFAULT_CHANNELS = ["Amazon", "Fewya", "Web", "Instagram"];

export const GET: APIRoute = async (context) => {
    if (isDemoMode(context.locals)) {
        return jsonResponse({
            products: mockStock.map((product) => ({
                id: product.producto_id,
                name: product.nombre_producto,
                price: product.venta_ud,
                stock: product.stock_actual,
            })),
            channels: DEFAULT_CHANNELS,
        });
    }

    const session = await sessionBackend(context);
    if (!session) return unauthorizedResponse();
    try {
        // Without the project the form would offer products from every project
        // the user belongs to.
        const projectId = parsePositiveInteger(context.url.searchParams.get("projectId"));
        const data = await session.backend.salesInitData(projectId ?? undefined);
        const channels = Array.from(new Set([...data.channels, ...DEFAULT_CHANNELS])).sort();
        return jsonResponse({ ...data, channels });
    } catch (error) {
        return backendError(error);
    }
};
