import type { APIRoute, ServerContext } from "@/lib/server-context";
import { backendError, demoResponse, jsonResponse, parsePositiveInteger, sessionBackend, unauthorizedResponse } from "../../../lib/legacy-api";
import { isDemoMode } from "../../../lib/runtime";

export const POST: APIRoute = (context) => handleSave(context, "POST");
export const PUT: APIRoute = (context) => handleSave(context, "PUT");

async function handleSave(context: ServerContext, method: string) {
    if (isDemoMode(context.locals)) return demoResponse(context);
    const session = await sessionBackend(context);
    if (!session) return unauthorizedResponse();

    try {
        const body = await context.request.json() as {
            id?: unknown;
            projectId?: unknown;
            tipo?: string;
            fecha?: string;
            concepto?: string;
            descripcion?: string;
            importe?: unknown;
            porcentaje_iva?: unknown;
        };
        const id = parsePositiveInteger(body.id);
        const projectId = parsePositiveInteger(body.projectId);
        const amount = Number(body.importe);
        const vatRate = body.porcentaje_iva === undefined || body.porcentaje_iva === ""
            ? 0
            : Number(body.porcentaje_iva);
        if (
            projectId === null ||
            !body.tipo ||
            !body.fecha ||
            !body.concepto ||
            !Number.isFinite(amount) ||
            amount <= 0 ||
            !Number.isFinite(vatRate) ||
            vatRate < 0 ||
            (method === "PUT" && id === null)
        ) {
            return jsonResponse({ error: "Missing required fields" }, 400);
        }

        const values = {
            type: body.tipo,
            concept: body.concepto,
            description: body.descripcion,
            amount,
            vatRate,
            date: body.fecha,
        };
        const savedId = method === "PUT"
            ? await session.backend.updateTransaction(projectId, id!, values)
            : await session.backend.createTransaction({ projectId, ...values });

        return jsonResponse({ success: true, id: savedId });
    } catch (error) {
        return backendError(error);
    }
}
