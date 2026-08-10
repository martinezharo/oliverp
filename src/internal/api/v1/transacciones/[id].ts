import type { APIRoute, ServerContext } from "@/lib/server-context";
import { requireBackend, resolveProjectId, type Principal } from "../../../../lib/api/auth";
import { ApiError } from "../../../../lib/api/errors";
import { apiHandler, json, parseBody } from "../../../../lib/api/handler";
import { actualizarTransaccionSchema } from "../../../../lib/api/schemas";
import { serializeTransaccion } from "../../../../lib/api/serializers";

function parseId(raw: string | undefined): number {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
        throw new ApiError("validation_error", "El id debe ser un entero positivo.");
    }
    return id;
}

/**
 * The project a legacy id belongs to. A pinned API key supplies it implicitly;
 * a browser session has to name it, because ids are only unique per project.
 */
function projectOf(context: ServerContext, principal: Principal): number {
    const raw = context.url.searchParams.get("proyecto_id");
    const requested = raw === null || raw === "" ? undefined : Number(raw);
    if (requested !== undefined && (!Number.isInteger(requested) || requested <= 0)) {
        throw new ApiError("validation_error", "'proyecto_id' debe ser un entero positivo.");
    }
    return resolveProjectId(principal, requested);
}

async function fetchTransaccion(principal: Principal, projectId: number, id: number) {
    const data = await requireBackend(principal).getTransaction(projectId, id);
    if (!data) throw new ApiError("not_found", `Transaccion ${id} no encontrada.`);
    return data;
}

export const GET: APIRoute = (context) =>
    apiHandler(context, "read", async (principal) => {
        const id = parseId(context.params.id);
        const projectId = projectOf(context, principal);
        return json({ data: serializeTransaccion(await fetchTransaccion(principal, projectId, id)) });
    });

export const PATCH: APIRoute = (context) =>
    apiHandler(context, "write", async (principal) => {
        const id = parseId(context.params.id);
        const body = await parseBody(context.request, actualizarTransaccionSchema);
        const projectId = projectOf(context, principal);

        await fetchTransaccion(principal, projectId, id);

        await requireBackend(principal).updateTransaction(projectId, id, {
            type: body.tipo,
            concept: body.concepto,
            description: body.descripcion,
            amount: body.importe,
            vatRate: body.porcentaje_iva,
            date: body.fecha,
        });
        return json({ data: serializeTransaccion(await fetchTransaccion(principal, projectId, id)) });
    });

export const DELETE: APIRoute = (context) =>
    apiHandler(context, "write", async (principal) => {
        const id = parseId(context.params.id);
        const projectId = projectOf(context, principal);
        await fetchTransaccion(principal, projectId, id);

        await requireBackend(principal).deleteTransaction(projectId, id);
        return json({ data: { id, borrada: true } });
    });
