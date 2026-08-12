import type { APIRoute } from "@/lib/server-context";
import { resolveProjectId } from "../../../lib/api/auth";
import { apiHandler, json, parseBody, parseQuery, withIdempotency } from "../../../lib/api/handler";
import { crearCompraSchema, filtrosComprasSchema } from "../../../lib/api/schemas";
import { paginated, serializeCompra } from "../../../lib/api/serializers";

/** GET /api/v1/compras */
export const GET: APIRoute = (context) =>
    apiHandler(context, "read", async (principal) => {
        const filtros = parseQuery(context.url, filtrosComprasSchema);
        const projectId = resolveProjectId(principal, filtros.proyecto_id);

        const { data, count } = await principal.backend!.listPurchases({
            projectId,
            page: filtros.page,
            pageSize: filtros.page_size,
            fromDate: filtros.desde,
            toDate: filtros.hasta,
        });

        return json(
            paginated(
                (data ?? []).map(serializeCompra),
                count ?? 0,
                filtros.page,
                filtros.page_size,
            ),
        );
    });

/**
 * POST /api/v1/compras
 *
 * Convex writes the purchase header, lines and stock movements in one mutation.
 */
export const POST: APIRoute = (context) =>
    apiHandler(context, "write", async (principal) => {
        const body = await parseBody(context.request, crearCompraSchema);
        const projectId = resolveProjectId(principal, body.proyecto_id);

        return withIdempotency(context, principal, "POST /api/v1/compras", body, async () => {
            const id = await principal.backend!.createPurchase({
                projectId,
                date: body.fecha,
                items: body.items.map((item) => ({
                    productId: item.producto_id,
                    units: item.unidades,
                    unitPrice: item.precio_unitario,
                    vatRate: item.porcentaje_iva,
                })),
            });
            const compra = await principal.backend!.getPurchase(projectId, id);
            return json({ data: serializeCompra(compra) }, 201);
        });
    });
