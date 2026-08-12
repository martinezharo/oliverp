import { ui } from "@/i18n/ui";

/**
 * Flattening of the three transaction tables into the single shape the
 * transactions and history views render.
 *
 * Sales, purchases and manual entries live in separate Convex tables with
 * their own vocabularies. Both the `/api/transactions/*` endpoints and the
 * browser (which subscribes to `session.transactionSources` directly) need
 * the same flattened rows, so the mapping lives here rather than being
 * written twice and drifting.
 */

export interface NormalizedTransaction {
  id: number;
  type: string;
  date: string;
  concept: string;
  units: number;
  amount: number;
  channel: string;
}

export interface TransactionSources {
  sales: Array<Record<string, unknown>>;
  purchases: Array<Record<string, unknown>>;
  others: Array<Record<string, unknown>>;
}

const PURCHASE_CHANNEL = "Proveedor";
const OTHER_CHANNEL = "Manual";

export function transactionDeleteUrl(projectId: number, transaction: Pick<NormalizedTransaction, "id" | "type">): string {
  const params = new URLSearchParams({
    id: String(transaction.id),
    projectId: String(projectId),
    type: transaction.type,
  });
  return `/api/transactions/delete?${params.toString()}`;
}

const unknownProduct = ui.en["txn.unknownProduct"];

function detailsOf(row: Record<string, unknown>, key: string): Array<Record<string, unknown>> {
  return (row[key] as Array<Record<string, unknown>> | undefined) ?? [];
}

/** Distinct product names, so a multi-line order reads as one concept. */
function conceptOf(details: Array<Record<string, unknown>>): string {
  const names = details.map(
    (detail) => (detail.producto as { nombre?: string } | null)?.nombre ?? unknownProduct,
  );
  return [...new Set(names)].join(", ");
}

function unitsOf(details: Array<Record<string, unknown>>): number {
  return details.reduce((sum, detail) => sum + Number(detail.unidades ?? 0), 0);
}

function totalOf(details: Array<Record<string, unknown>>, priceKey: string): number {
  return details.reduce(
    (sum, detail) => sum + Number(detail.unidades ?? 0) * Number(detail[priceKey] ?? 0),
    0,
  );
}

function saleTransaction(row: Record<string, unknown>): NormalizedTransaction {
  const details = detailsOf(row, "venta_detalle");
  return {
    id: Number(row.id),
    type: "venta",
    date: String(row.fecha),
    concept: conceptOf(details),
    units: unitsOf(details),
    amount: totalOf(details, "precio_unitario_venta"),
    channel: String(row.canal ?? ""),
  };
}

function purchaseTransaction(row: Record<string, unknown>): NormalizedTransaction {
  const details = detailsOf(row, "compra_detalle");
  return {
    id: Number(row.id),
    type: "compra",
    date: String(row.fecha),
    concept: conceptOf(details),
    units: unitsOf(details),
    amount: -totalOf(details, "precio_unitario_compra"),
    channel: PURCHASE_CHANNEL,
  };
}

function otherTransaction(row: Record<string, unknown>): NormalizedTransaction {
  const type = String(row.tipo);
  const amount = Math.abs(Number(row.importe));
  return {
    id: Number(row.id),
    type,
    date: String(row.fecha),
    concept: String(row.concepto),
    units: 1,
    amount: type === "gasto" ? -amount : amount,
    channel: OTHER_CHANNEL,
  };
}

export interface TransactionFilter {
  type?: string;
  search?: string;
  channel?: string;
  amountMin?: number;
  amountMax?: number;
  dateFrom?: string;
  dateTo?: string;
}

/** Flatten every source into one list, newest first. */
export function normalizeTransactions(sources: TransactionSources): NormalizedTransaction[] {
  return [
    ...sources.sales.map(saleTransaction),
    ...sources.purchases.map(purchaseTransaction),
    ...sources.others.map(otherTransaction),
  ].sort((a, b) => (a.date !== b.date ? b.date.localeCompare(a.date) : b.id - a.id));
}

/**
 * Applied to already flattened rows so the browser can re-filter the list it
 * is subscribed to without asking the server again on every keystroke.
 */
export function filterTransactions(
  rows: NormalizedTransaction[],
  filter: TransactionFilter,
): NormalizedTransaction[] {
  const type = filter.type ?? "";
  const channel = filter.channel ?? "";
  const search = (filter.search ?? "").trim().toLowerCase();

  return rows.filter((row) => {
    if (type && row.type !== type) return false;
    if (channel && row.channel !== channel) return false;
    if (search && !row.concept.toLowerCase().includes(search)) return false;
    if (filter.amountMin !== undefined && row.amount < filter.amountMin) return false;
    if (filter.amountMax !== undefined && row.amount > filter.amountMax) return false;
    if (filter.dateFrom && row.date < filter.dateFrom) return false;
    // The stored date carries a time, so an inclusive upper bound compares
    // against the end of that day.
    if (filter.dateTo && row.date > `${filter.dateTo}T23:59:59`) return false;
    return true;
  });
}
