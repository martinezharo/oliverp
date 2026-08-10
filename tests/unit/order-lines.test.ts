import { describe, expect, it } from "vitest";
import { orderLines } from "../../src/components/legacy/OperationModals";

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
});
