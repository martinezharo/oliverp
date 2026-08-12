import type { StockRow } from "@/types/erp";

/** Columns the inventory table can be ordered by. */
export type SortColumn = "name" | "stock" | "value" | "profit_u" | "profit_30d" | "status";
export type Sort = { column: SortColumn; direction: "asc" | "desc" };

export function sortValue(item: StockRow, column: SortColumn): string | number {
  if (column === "name") return item.nombre_producto;
  if (column === "stock") return item.stock_actual;
  if (column === "value") return item.valor_stock;
  if (column === "profit_u") return item.beneficio_ud;
  if (column === "profit_30d") return item.beneficio_total_30d;
  // Status sorts by urgency: sold out first, then by days of stock left, with
  // products of unknown coverage parked at the far end.
  if (item.stock_actual <= 0) return -1;
  return item.dias_stock_restante ?? 999999;
}

export function sortStock(rows: StockRow[], sort: Sort): StockRow[] {
  return [...rows].sort((a, b) => {
    const left = sortValue(a, sort.column);
    const right = sortValue(b, sort.column);
    const comparison = typeof left === "number" && typeof right === "number"
      ? left - right
      : String(left).localeCompare(String(right));
    return sort.direction === "asc" ? comparison : -comparison;
  });
}

/** Clicking the active column flips it; a new column starts at its natural end. */
export function nextSort(current: Sort, column: SortColumn): Sort {
  if (current.column === column) {
    return { column, direction: current.direction === "asc" ? "desc" : "asc" };
  }
  // Names read best A-Z; every numeric column is most useful largest first.
  return { column, direction: column === "name" ? "asc" : "desc" };
}
