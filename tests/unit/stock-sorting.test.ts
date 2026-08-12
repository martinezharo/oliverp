import { describe, expect, it } from "vitest";

import { nextSort, sortStock } from "../../src/lib/stock";

import type { StockRow } from "../../src/types/erp";

function product(nombre_producto: string, values: Partial<StockRow> = {}): StockRow {
    return {
        proyecto_id: 1,
        producto_id: Math.abs([...nombre_producto].reduce((sum, char) => sum + char.charCodeAt(0), 0)),
        nombre_producto,
        stock_actual: 10,
        coste_ud: 1,
        venta_ud: 2,
        beneficio_ud: 1,
        beneficio_total_30d: 10,
        valor_stock: 20,
        ...values,
    };
}

const names = (rows: StockRow[]) => rows.map((row) => row.nombre_producto);

describe("stock sorting", () => {
    it("orders names alphabetically and reverses on demand", () => {
        const rows = [product("Charlie"), product("alpha"), product("Bravo")];

        expect(names(sortStock(rows, { column: "name", direction: "asc" }))).toEqual(["alpha", "Bravo", "Charlie"]);
        expect(names(sortStock(rows, { column: "name", direction: "desc" }))).toEqual(["Charlie", "Bravo", "alpha"]);
    });

    it("compares numeric columns as numbers, not as text", () => {
        const rows = [product("nine", { stock_actual: 9 }), product("eighty", { stock_actual: 80 })];

        // Sorted as strings, "80" would come before "9".
        expect(names(sortStock(rows, { column: "stock", direction: "asc" }))).toEqual(["nine", "eighty"]);
    });

    it("leaves the input array untouched", () => {
        const rows = [product("Beta"), product("Alpha")];
        sortStock(rows, { column: "name", direction: "asc" });

        expect(names(rows)).toEqual(["Beta", "Alpha"]);
    });

    it("ranks status by urgency: sold out, then soonest to run out", () => {
        const rows = [
            product("plenty", { dias_stock_restante: 90 }),
            product("sold out", { stock_actual: 0, dias_stock_restante: 0 }),
            product("unknown", { dias_stock_restante: null }),
            product("running low", { dias_stock_restante: 3 }),
        ];

        expect(names(sortStock(rows, { column: "status", direction: "asc" })))
            .toEqual(["sold out", "running low", "plenty", "unknown"]);
    });
});

describe("sort toggling", () => {
    it("flips the direction when the active column is clicked again", () => {
        expect(nextSort({ column: "stock", direction: "desc" }, "stock")).toEqual({ column: "stock", direction: "asc" });
        expect(nextSort({ column: "stock", direction: "asc" }, "stock")).toEqual({ column: "stock", direction: "desc" });
    });

    it("starts a new column at its most useful end", () => {
        expect(nextSort({ column: "stock", direction: "asc" }, "name")).toEqual({ column: "name", direction: "asc" });
        expect(nextSort({ column: "name", direction: "asc" }, "profit_30d")).toEqual({ column: "profit_30d", direction: "desc" });
    });
});
