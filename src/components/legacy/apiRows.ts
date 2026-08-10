import type { FinanceRow, StockRow } from "./types";

/**
 * The bridge between the two vocabularies in play.
 *
 * `/api/v1/*` publishes the documented API field names (`producto`,
 * `coste_unitario`, `beneficio_neto`, …), while these components and the demo
 * fixtures still speak the older database-view names (`nombre_producto`,
 * `coste_ud`, `urp`, …). Mapping here keeps the published names a stable
 * contract instead of renaming either side — and a missing field no longer
 * shows up in the UI as an empty cell or `€NaN`.
 */

export type StockApiRow = {
  producto_id: number;
  producto: string;
  proyecto_id: number;
  stock_actual: number;
  coste_unitario: number;
  precio_venta_unitario: number;
  beneficio_unitario: number;
  ventas_30d: number;
  venta_diaria_promedio: number;
  dias_stock_restante: number;
  valor_stock: number;
};

export function toStockRow(row: StockApiRow): StockRow {
  return {
    proyecto_id: row.proyecto_id,
    producto_id: row.producto_id,
    nombre_producto: row.producto,
    stock_actual: row.stock_actual,
    coste_ud: row.coste_unitario,
    venta_ud: row.precio_venta_unitario,
    beneficio_ud: row.beneficio_unitario,
    // Not published by the API: 30-day profit is the unit margin over the
    // units actually sold in that window.
    beneficio_total_30d: Math.round(row.beneficio_unitario * row.ventas_30d * 100) / 100,
    valor_stock: row.valor_stock,
    num_ventas_30d: row.ventas_30d,
    venta_diaria_promedio: row.venta_diaria_promedio,
    dias_stock_restante: row.dias_stock_restante,
  };
}

export type FinanceApiRow = Omit<FinanceRow, "urp"> & { beneficio_neto: number };

export function toFinanceRow(row: FinanceApiRow): FinanceRow {
  return { ...row, urp: row.beneficio_neto };
}
