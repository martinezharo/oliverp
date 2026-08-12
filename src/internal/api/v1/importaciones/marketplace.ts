import type { APIRoute } from "@/lib/server-context";
import { requireBackend, resolveProjectId } from "../../../../lib/api/auth";
import { ApiError } from "../../../../lib/api/errors";
import { apiHandler, json, parseBody, withIdempotency } from "../../../../lib/api/handler";
import { importarVentaMarketplaceSchema } from "../../../../lib/api/schemas";
import { serializeVenta } from "../../../../lib/api/serializers";

/**
 * POST /api/v1/importaciones/marketplace
 *
 * Receives a confirmed sale extracted from a supported marketplace email.
 * The marketplace title is matched against the corresponding product mapping
 * before the customer, sale, and stock movement are written atomically.
 */
export const POST: APIRoute = (context) =>
  apiHandler(context, "write", async (principal) => {
    const body = await parseBody(context.request, importarVentaMarketplaceSchema);
    const projectId = resolveProjectId(principal, body.proyecto_id);

    return withIdempotency(
      context,
      principal,
      "POST /api/v1/importaciones/marketplace",
      body,
      async () => {
        const result = await requireBackend(principal).importMarketplaceSale({
          projectId,
          originId: body.origen_id,
          date: body.fecha,
          customerName: body.comprador_nombre,
          marketplaceTitle: body.titulo_producto,
          channel: body.canal,
          totalAmount: body.importe_total,
          units: body.unidades,
          vatRate: body.porcentaje_iva,
        });
        const sale = await requireBackend(principal).getSale(projectId, result.id);
        if (!sale) {
          throw new ApiError(
            "internal_error",
            "La importación no devolvió la venta creada.",
          );
        }

        return json(
          { data: serializeVenta(sale), importada: result.created },
          result.created ? 201 : 200,
        );
      },
    );
  });
