import type { APIRoute, ServerContext } from "@/lib/server-context";
import { backendError, demoResponse, jsonResponse, sessionBackend, unauthorizedResponse } from "../../../lib/legacy-api";
import { isDemoMode } from "../../../lib/runtime";

export const POST: APIRoute = (context) => handleSave(context, "POST");
export const PUT: APIRoute = (context) => handleSave(context, "PUT");

async function handleSave(context: ServerContext, method: string) {
    if (isDemoMode(context.locals)) return demoResponse(context);
    const session = await sessionBackend(context);
    if (!session) return unauthorizedResponse();

    try {
        const body = await context.request.json() as {
            id?: number;
            projectId?: number;
            tipo?: string;
            fecha?: string;
            concepto?: string;
            descripcion?: string;
            importe?: number | string;
            porcentaje_iva?: number | string;
        };
        if (!body.projectId || !body.tipo || !body.fecha || !body.concepto || !body.importe) {
            return jsonResponse({ error: "Missing required fields" }, 400);
        }

        const values = {
            type: body.tipo,
            concept: body.concepto,
            description: body.descripcion,
            amount: Number(body.importe),
            vatRate: body.porcentaje_iva ? Number(body.porcentaje_iva) : 0,
            date: body.fecha,
        };
        const id = method === "PUT" && body.id
            ? await session.backend.updateTransaction(body.id, values)
            : await session.backend.createTransaction({ projectId: body.projectId, ...values });

        return jsonResponse({ success: true, id });
    } catch (error) {
        return backendError(error);
    }
}
