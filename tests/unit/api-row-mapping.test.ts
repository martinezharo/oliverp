import { describe, expect, it } from "vitest";
import { toFinanceRow, toStockRow, type FinanceApiRow, type StockApiRow } from "../../src/lib/api-rows";
import { serializeFinanzas, serializeStock } from "../../src/lib/api/serializers";

/**
 * The pages read the public v1 payload but render the older view vocabulary.
 * These tests pin the two together: a rename on either side used to surface as
 * a blank product name and `€NaN` in the stock table.
 */
describe("v1 payload to table rows", () => {
    it("maps a serialized stock row onto every field the table reads", () => {
        const payload = serializeStock({
            producto_id: 7,
            nombre_producto: "Mando LG",
            proyecto_id: 4,
            stock_actual: 12,
            coste_ud: 3.2,
            venta_ud: 9.99,
            beneficio_ud: 6.79,
            num_ventas_30d: 5,
            venta_diaria_promedio: 0.167,
            dias_stock_restante: 72,
            valor_stock: 38.4,
        }) as StockApiRow;

        const row = toStockRow(payload);

        expect(row).toMatchObject({
            producto_id: 7,
            nombre_producto: "Mando LG",
            stock_actual: 12,
            coste_ud: 3.2,
            venta_ud: 9.99,
            beneficio_ud: 6.79,
            valor_stock: 38.4,
        });
        expect(row.beneficio_total_30d).toBe(33.95);
        expect(Object.values(row).every((value) => !Number.isNaN(value as number))).toBe(true);
    });

    it("restores the net profit the finance payload publishes as beneficio_neto", () => {
        const payload = serializeFinanzas({
            dia: "2026-08-10",
            proyecto_id: 4,
            ingresos: 100,
            gastos: 40,
            balance: 60,
            urp: 55,
            iva_soportado: 8,
            iva_repercutido: 21,
            saldo_iva: 13,
        }) as FinanceApiRow;

        expect(payload).not.toHaveProperty("urp");
        expect(toFinanceRow(payload).urp).toBe(55);
    });
});
