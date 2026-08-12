import type { APIRoute } from "@/lib/server-context";
import { backendError, demoResponse, jsonResponse, sessionBackend, unauthorizedResponse } from "../../../lib/legacy-api";
import { isDemoMode } from "../../../lib/runtime";

export const POST: APIRoute = async (context) => {
    if (isDemoMode(context.locals)) return demoResponse(context);
    const session = await sessionBackend(context);
    if (!session) return unauthorizedResponse();

    try {
        const body = await context.request.json() as {
            projectId?: number;
            date?: string;
            items?: Array<{ productId: number; units: number; unitPrice: number; tax?: number }>;
        };
        if (!body.projectId || !body.date || !body.items?.length) {
            return jsonResponse({ error: "Missing required fields" }, 400);
        }

        const id = await session.backend.createPurchase({
            projectId: body.projectId,
            date: body.date,
            items: body.items.map((item) => ({
                productId: item.productId,
                units: item.units,
                unitPrice: item.unitPrice,
                vatRate: item.tax ?? 21,
            })),
        });
        return jsonResponse({ success: true, id });
    } catch (error) {
        return backendError(error);
    }
};
