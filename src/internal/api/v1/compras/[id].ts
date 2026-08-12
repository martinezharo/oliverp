import type { APIRoute, ServerContext } from "@/lib/server-context";
import { requireBackend, resolveProjectId, type Principal } from "../../../../lib/api/auth";
import { ApiError } from "../../../../lib/api/errors";
import { apiHandler, json, parseBody } from "../../../../lib/api/handler";
import { actualizarCompraSchema } from "../../../../lib/api/schemas";
import { serializeCompra } from "../../../../lib/api/serializers";

function parseId(raw: string | undefined): number {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
        throw new ApiError("validation_error", "El id de la compra debe ser un entero positivo.");
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

async function fetchCompra(principal: Principal, projectId: number, id: number) {
    const data = await requireBackend(principal).getPurchase(projectId, id);
    if (!data) throw new ApiError("not_found", `Compra ${id} no encontrada.`);
    return data;
}

/** GET /api/v1/compras/{id} */
export const GET: APIRoute = (context) =>
    apiHandler(context, "read", async (principal) => {
        const id = parseId(context.params.id);
        const projectId = projectOf(context, principal);
        return json({ data: serializeCompra(await fetchCompra(principal, projectId, id)) });
    });

/**
 * PATCH /api/v1/compras/{id}
 *
 * Omitting `items` edits only the date. Passing `items` replaces every line and
 * its stock movements atomically.
 */
export const PATCH: APIRoute = (context) =>
    apiHandler(context, "write", async (principal) => {
        const id = parseId(context.params.id);
        const body = await parseBody(context.request, actualizarCompraSchema);
        const projectId = projectOf(context, principal);

        await fetchCompra(principal, projectId, id);

        await requireBackend(principal).updatePurchase(projectId, id, {
            date: body.fecha,
            items: body.items?.map((item) => ({
                productId: item.producto_id,
                units: item.unidades,
                unitPrice: item.precio_unitario,
                vatRate: item.porcentaje_iva,
            })),
        });

        return json({ data: serializeCompra(await fetchCompra(principal, projectId, id)) });
    });
