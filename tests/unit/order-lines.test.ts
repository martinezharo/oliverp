import { describe, expect, it } from "vitest";
import { orderLines, purchaseItemsFromRecord, saleItemsFromRecord } from "../../src/components/operations/shared";

/**
 * The sale form once passed the field name where the product id belonged, so
 * rows carried `productId: "productId"`. `Number()` made that NaN, JSON turned
 * it into `null`, and the mutation failed with an opaque server error instead
 * of anything the user could act on.
 */
describe("order lines", () => {
    it("drops rows whose product is not a real id", () => {
        expect(orderLines([
            { productId: "", units: "1", price: "5", tax: "21" },
            { productId: "productId", units: "1", price: "5", tax: "21" },
            { productId: "0", units: "1", price: "5", tax: "21" },
            { productId: "1.5", units: "1", price: "5", tax: "21" },
        ])).toEqual([]);
    });

    it("keeps a chosen product and applies the row defaults", () => {
        expect(orderLines([
            { productId: "7", units: "", price: "", tax: "" },
            { productId: "8", units: "3", price: "9.99", tax: "10" },
        ])).toEqual([
            { productId: 7, units: 1, price: 0, tax: 21 },
            { productId: 8, units: 3, price: 9.99, tax: 10 },
        ]);
    });

    it("hydrates sale and purchase edit rows with their stored prices and VAT", () => {
        expect(saleItemsFromRecord([{
            producto_id: 7,
            unidades: 2,
            precio_unitario_venta: 12.5,
            porcentaje_iva: 10,
        }])).toEqual([{ productId: "7", units: "2", price: "12.5", tax: "10" }]);
        expect(purchaseItemsFromRecord([{
            producto_id: 8,
            unidades: 3,
            precio_unitario_compra: 4.25,
        }])).toEqual([{ productId: "8", units: "3", price: "4.25", tax: "21" }]);
    });
});
