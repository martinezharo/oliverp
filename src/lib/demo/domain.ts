/**
 * The read models, derived from the in-memory records.
 *
 * These are the demo's copy of `convex/domain.ts`: the daily finance rollup,
 * the stock table, the movement history and the flattened transaction list are
 * computed from orders and entries with the same arithmetic the backend uses —
 * average cost over the last sixty days of purchases, VAT extracted from gross
 * amounts, `vat_only` plugin hooks honoured. Anything a screen shows in demo
 * mode is therefore what that screen would show for the same operations
 * against a real account, rather than a table of numbers invented to look
 * plausible next to each other.
 *
 * Every function is pure and dates itself from `dataset.day`, so the Worker
 * and the browser always compute the same answer.
 */

import { euros, vatPart } from "./money";
import type { DemoDataset, DemoLine, DemoProject } from "./types";
import type { FinanceRow, StockRow } from "@/types/erp";
import { DEFAULT_SALE_CHANNELS, type TransactionSources } from "@/lib/transactions";

const DAY_MS = 24 * 60 * 60 * 1000;

export type DemoFinanceRow = FinanceRow & { nombre_proyecto: string };
/** The same row while it is still being added up: no field is absent yet. */
type FinanceAccumulator = Required<DemoFinanceRow>;
export type DemoStockRow = StockRow & { nombre_proyecto: string };

/** One row of a product's movement history, as the stock dialog reads it. */
export type DemoMovement = {
  id: number;
  fecha: string;
  tipo: "venta" | "compra" | "ajuste manual";
  unidades: number;
  precio: number | null;
  canal: string;
};

/** The channel names the backend gives movements that are not sales. */
const SUPPLIER_CHANNEL = "Proveedor";
const MANUAL_CHANNEL = "Manual";

export function projectOf(dataset: DemoDataset, projectId: number): DemoProject | undefined {
  return dataset.projects.find((project) => project.id === projectId);
}

function productName(dataset: DemoDataset, projectId: number, productId: number): string | null {
  const product = dataset.products.find(
    (item) => item.projectId === projectId && item.id === productId,
  );
  return product ? product.name : null;
}

/** The day `days` before the end of the sample history, as `YYYY-MM-DD`. */
function dayBefore(dataset: DemoDataset, days: number): string {
  return new Date(Date.parse(`${dataset.day}T00:00:00.000Z`) - days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** The next per-project id for a table, the way legacy ids are allocated. */
export function nextId(rows: Array<{ id: number; projectId: number }>, projectId: number): number {
  return rows.reduce((top, row) => (row.projectId === projectId && row.id > top ? row.id : top), 0) + 1;
}

const linesOf = (lines: DemoLine[]) => lines;

// ── Daily finances ──────────────────────────────────────────

/**
 * The daily read model, oldest day first, exactly as `computeDailyFinances`
 * builds it: revenue and cost from order lines, the rest from manual entries,
 * with the concepts an enabled `vat_only` hook covers contributing their VAT
 * but not their amount.
 */
export function financeRows(dataset: DemoDataset, projectId: number): DemoFinanceRow[] {
  const project = projectOf(dataset, projectId);
  if (!project) return [];

  const vatOnlyConcepts = new Set(
    dataset.plugins
      .filter((plugin) => plugin.projectId === projectId && plugin.enabled)
      .flatMap((plugin) => plugin.hooks)
      .filter((hook) => hook.type === "finance.other_transaction.vat_only")
      .map((hook) => hook.concept),
  );

  // The cost a sale is measured against is the most recent price paid for that
  // product, which is what the backend uses to turn revenue into net profit.
  const latestCost = new Map<number, { date: string; cost: number }>();
  for (const purchase of dataset.purchases) {
    if (purchase.projectId !== projectId) continue;
    for (const line of linesOf(purchase.lines)) {
      const previous = latestCost.get(line.productId);
      if (!previous || purchase.date >= previous.date) {
        latestCost.set(line.productId, { date: purchase.date, cost: line.unitPriceCents });
      }
    }
  }

  const grouped = new Map<string, FinanceAccumulator>();
  const rowFor = (day: string) => {
    let row = grouped.get(day);
    if (!row) {
      row = {
        dia: day,
        proyecto_id: projectId,
        nombre_proyecto: project.name,
        ingresos: 0,
        gastos: 0,
        balance: 0,
        urp: 0,
        iva_soportado: 0,
        iva_repercutido: 0,
        saldo_iva: 0,
      };
      grouped.set(day, row);
    }
    return row;
  };

  for (const sale of dataset.sales) {
    if (sale.projectId !== projectId) continue;
    const row = rowFor(sale.date);
    for (const line of sale.lines) {
      const gross = line.units * line.unitPriceCents;
      row.ingresos += gross;
      row.urp += gross - (latestCost.get(line.productId)?.cost ?? 0) * line.units;
      row.iva_repercutido += vatPart(gross, line.vatRate);
    }
  }

  for (const purchase of dataset.purchases) {
    if (purchase.projectId !== projectId) continue;
    const row = rowFor(purchase.date);
    for (const line of purchase.lines) {
      const gross = line.units * line.unitPriceCents;
      row.gastos += gross;
      row.urp -= gross;
      row.iva_soportado += vatPart(gross, line.vatRate);
    }
  }

  for (const other of dataset.others) {
    if (other.projectId !== projectId) continue;
    const row = rowFor(other.date);
    const vatOnly = vatOnlyConcepts.has(other.concept);
    if (other.type === "ingreso") {
      if (!vatOnly) row.ingresos += other.amountCents;
      row.iva_repercutido += vatPart(other.amountCents, other.vatRate);
    } else {
      if (!vatOnly) {
        row.gastos += other.amountCents;
        row.urp -= other.amountCents;
      }
      row.iva_soportado += vatPart(other.amountCents, other.vatRate);
    }
  }

  return Array.from(grouped.values())
    .map((row) => ({
      ...row,
      ingresos: euros(row.ingresos),
      gastos: euros(row.gastos),
      balance: euros(row.ingresos - row.gastos),
      urp: euros(row.urp),
      iva_soportado: euros(row.iva_soportado),
      iva_repercutido: euros(row.iva_repercutido),
      saldo_iva: euros(row.iva_repercutido - row.iva_soportado),
    }))
    .sort((a, b) => a.dia.localeCompare(b.dia));
}

/**
 * The revenue chart's series: one point per day for the last `days`, gaps
 * included, oldest first.
 *
 * It counts days back from the end of the sample history rather than from
 * `new Date()`, so the Worker and the browser plot the same points no matter
 * what hour it is or which timezone the reader is in — a mismatch there would
 * throw the server-rendered page away and rebuild it.
 */
export function evolutionSeries(
  dataset: DemoDataset,
  projectId: number,
  days: number,
): Array<{ date: string; ingresos: number; urp: number }> {
  const rows = new Map(financeRows(dataset, projectId).map((row) => [row.dia, row]));
  const series: Array<{ date: string; ingresos: number; urp: number }> = [];

  for (let daysAgo = days; daysAgo >= 0; daysAgo--) {
    const date = dayBefore(dataset, daysAgo);
    const row = rows.get(date);
    series.push({ date, ingresos: row?.ingresos ?? 0, urp: row?.urp ?? 0 });
  }
  return series;
}

// ── Stock ───────────────────────────────────────────────────

/** The inventory table: one row per product, cheapest-to-run-out first. */
export function stockRows(dataset: DemoDataset, projectId: number): DemoStockRow[] {
  const project = projectOf(dataset, projectId);
  if (!project) return [];

  const cutoff30 = dayBefore(dataset, 30);
  const cutoff60 = dayBefore(dataset, 60);
  const sales = dataset.sales.filter((sale) => sale.projectId === projectId);
  const purchases = dataset.purchases.filter((purchase) => purchase.projectId === projectId);
  const adjustments = dataset.adjustments.filter((entry) => entry.projectId === projectId);

  return dataset.products
    .filter((product) => product.projectId === projectId)
    .map((product) => {
      const purchaseLines = purchases.flatMap((purchase) =>
        purchase.lines
          .filter((line) => line.productId === product.id)
          .map((line) => ({ ...line, date: purchase.date })),
      );
      const saleLines = sales.flatMap((sale) =>
        sale.lines
          .filter((line) => line.productId === product.id)
          .map((line) => ({ ...line, date: sale.date })),
      );

      const bought = purchaseLines.reduce((sum, line) => sum + line.units, 0);
      const sold = saleLines.reduce((sum, line) => sum + line.units, 0);
      const corrected = adjustments
        .filter((entry) => entry.productId === product.id)
        .reduce((sum, entry) => sum + entry.units, 0);
      const stock = bought - sold + corrected;

      // Recent prices describe today's margin; older ones are only a fallback
      // for a product that has not moved lately.
      const recentPurchases = purchaseLines.filter((line) => line.date >= cutoff60);
      const costLines = recentPurchases.length ? recentPurchases : purchaseLines;
      const cost = costLines.length
        ? costLines.reduce((sum, line) => sum + line.unitPriceCents, 0) / costLines.length
        : 0;

      const recentSales = saleLines.filter((line) => line.date >= cutoff30);
      const priceLines = recentSales.length ? recentSales : saleLines;
      const price = priceLines.length
        ? priceLines.reduce((sum, line) => sum + line.unitPriceCents, 0) / priceLines.length
        : 0;

      const sales30 = recentSales.reduce((sum, line) => sum + line.units, 0);
      const daily = sales30 / 30;
      const costEuros = euros(cost);
      const priceEuros = euros(price);
      const profit = costEuros === 0 && priceEuros === 0 ? 0 : priceEuros - costEuros;

      return {
        proyecto_id: projectId,
        nombre_proyecto: project.name,
        producto_id: product.id,
        nombre_producto: product.name,
        stock_actual: stock,
        coste_ud: costEuros,
        venta_ud: priceEuros,
        num_ventas_30d: sales30,
        beneficio_ud: profit,
        beneficio_total_30d: profit * sales30,
        valor_stock: stock * priceEuros,
        venta_diaria_promedio: daily,
        dias_stock_restante: daily > 0 ? stock / daily : 999,
      };
    })
    .sort((a, b) => a.dias_stock_restante - b.dias_stock_restante);
}

/** Everything that ever moved one product, newest first. */
export function stockMovements(
  dataset: DemoDataset,
  projectId: number,
  productId: number,
): DemoMovement[] {
  const movements: DemoMovement[] = [];

  for (const purchase of dataset.purchases) {
    if (purchase.projectId !== projectId) continue;
    for (const line of purchase.lines) {
      if (line.productId !== productId) continue;
      movements.push({
        id: purchase.id,
        fecha: purchase.date,
        tipo: "compra",
        unidades: line.units,
        precio: euros(line.unitPriceCents),
        canal: SUPPLIER_CHANNEL,
      });
    }
  }

  for (const sale of dataset.sales) {
    if (sale.projectId !== projectId) continue;
    for (const line of sale.lines) {
      if (line.productId !== productId) continue;
      movements.push({
        id: sale.id,
        fecha: sale.date,
        tipo: "venta",
        unidades: -line.units,
        precio: euros(line.unitPriceCents),
        canal: sale.channel || "Directo",
      });
    }
  }

  for (const entry of dataset.adjustments) {
    if (entry.projectId !== projectId || entry.productId !== productId) continue;
    movements.push({
      id: entry.id,
      fecha: entry.date,
      tipo: "ajuste manual",
      unidades: entry.units,
      precio: null,
      canal: MANUAL_CHANNEL,
    });
  }

  // Newest day first, and within a day in the order the movements were
  // recorded — the backend sorts on the date alone too, and its ids come from
  // one table, so comparing a sale's id with an adjustment's would mean
  // nothing here.
  return movements.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

// ── Transactions ────────────────────────────────────────────

/**
 * The three tables in the shape `normalizeTransactions` flattens, so the demo
 * list is built by the same code that builds the real one.
 */
export function transactionSources(dataset: DemoDataset, projectId: number): TransactionSources {
  return {
    sales: dataset.sales
      .filter((sale) => sale.projectId === projectId)
      .map((sale) => saleRecord(dataset, sale.projectId, sale.id))
      .filter((row): row is NonNullable<typeof row> => row !== null),
    purchases: dataset.purchases
      .filter((purchase) => purchase.projectId === projectId)
      .map((purchase) => purchaseRecord(dataset, purchase.projectId, purchase.id))
      .filter((row): row is NonNullable<typeof row> => row !== null),
    others: dataset.others
      .filter((other) => other.projectId === projectId)
      .map((other) => otherRecord(dataset, other.projectId, other.id))
      .filter((row): row is NonNullable<typeof row> => row !== null),
  };
}

/** One sale in the shape `/api/sales/get` answers with. */
export function saleRecord(dataset: DemoDataset, projectId: number, id: number) {
  const sale = dataset.sales.find((row) => row.projectId === projectId && row.id === id);
  if (!sale) return null;
  return {
    id: sale.id,
    proyecto_id: sale.projectId,
    fecha: sale.date,
    canal: sale.channel,
    cliente_id: null,
    cliente: null,
    origen: "manual",
    origen_id: null,
    venta_detalle: sale.lines.map((line, index) => ({
      id: index + 1,
      producto_id: line.productId,
      unidades: line.units,
      precio_unitario_venta: euros(line.unitPriceCents),
      porcentaje_iva: line.vatRate,
      producto: { nombre: productName(dataset, projectId, line.productId) ?? "" },
    })),
  };
}

/** One purchase in the shape `/api/purchases/get` answers with. */
export function purchaseRecord(dataset: DemoDataset, projectId: number, id: number) {
  const purchase = dataset.purchases.find((row) => row.projectId === projectId && row.id === id);
  if (!purchase) return null;
  return {
    id: purchase.id,
    proyecto_id: purchase.projectId,
    fecha: purchase.date,
    compra_detalle: purchase.lines.map((line, index) => ({
      id: index + 1,
      producto_id: line.productId,
      unidades: line.units,
      precio_unitario_compra: euros(line.unitPriceCents),
      porcentaje_iva: line.vatRate,
      producto: { nombre: productName(dataset, projectId, line.productId) ?? "" },
    })),
  };
}

/** One manual entry in the shape `/api/transactions/get-other` answers with. */
export function otherRecord(dataset: DemoDataset, projectId: number, id: number) {
  const other = dataset.others.find((row) => row.projectId === projectId && row.id === id);
  if (!other) return null;
  return {
    id: other.id,
    proyecto_id: other.projectId,
    tipo: other.type,
    concepto: other.concept,
    descripcion: other.description,
    importe: euros(other.amountCents),
    porcentaje_iva: other.vatRate,
    fecha: other.date,
  };
}

// ── Form data ───────────────────────────────────────────────

/** The catalogue and the known channels the operation forms offer. */
export function salesInitData(dataset: DemoDataset, projectId: number) {
  return {
    products: stockRows(dataset, projectId).map((row) => ({
      id: row.producto_id,
      name: row.nombre_producto,
      price: row.venta_ud,
      stock: row.stock_actual,
    })),
    channels: Array.from(
      new Set([
        ...dataset.sales.filter((sale) => sale.projectId === projectId).map((sale) => sale.channel),
        ...DEFAULT_SALE_CHANNELS,
      ]),
    ).sort(),
  };
}

/** The concepts already used, for the manual entry form's suggestions. */
export function otherConcepts(dataset: DemoDataset, projectId: number): string[] {
  return Array.from(
    new Set(
      dataset.others.filter((other) => other.projectId === projectId).map((other) => other.concept),
    ),
  ).sort();
}
