import type { Translator } from "@/i18n/t";

import type { FinanceRow } from "@/types/erp";

/**
 * Rollups over the daily finance read model.
 *
 * The dashboard and the history screen both fold the same rows into periods;
 * keeping the arithmetic here means the totals cannot drift between the two
 * screens, and it can be tested without rendering anything.
 */

export type Totals = {
  ingresos: number;
  gastos: number;
  balance: number;
  urp: number;
  iva_soportado: number;
  iva_repercutido: number;
  saldo_iva: number;
};

export const zeroTotals = (): Totals => ({
  ingresos: 0,
  gastos: 0,
  balance: 0,
  urp: 0,
  iva_soportado: 0,
  iva_repercutido: 0,
  saldo_iva: 0,
});

/** Adds one day onto a running total. Missing figures count as zero. */
export function addRow(totals: Totals, row: FinanceRow): Totals {
  totals.ingresos += row.ingresos || 0;
  totals.gastos += row.gastos || 0;
  totals.balance += row.balance || 0;
  totals.urp += row.urp || 0;
  totals.iva_soportado += row.iva_soportado || 0;
  totals.iva_repercutido += row.iva_repercutido || 0;
  totals.saldo_iva += row.saldo_iva || 0;
  return totals;
}

export type Summary = {
  month: Totals;
  quarter: Totals;
  /** The month extrapolated from the days recorded so far. */
  projection: { ingresos: number; urp: number };
  currentDay: number;
  daysInMonth: number;
};

/** Month to date, quarter to date, and a straight-line projection of the month. */
export function summarizeFinances(rows: FinanceRow[], now = new Date()): Summary {
  const year = now.getFullYear();
  const month = now.getMonth();
  const currentDay = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOfQuarter = new Date(year, Math.floor(month / 3) * 3, 1);
  const startOfMonth = new Date(year, month, 1);

  const monthTotals = zeroTotals();
  const quarterTotals = zeroTotals();
  for (const row of rows) {
    const day = new Date(row.dia);
    if (day < startOfQuarter) continue;
    addRow(quarterTotals, row);
    if (day >= startOfMonth) addRow(monthTotals, row);
  }

  // Assume the remaining days behave like the ones already recorded.
  const factor = daysInMonth / Math.max(1, currentDay);

  return {
    month: monthTotals,
    quarter: quarterTotals,
    projection: { ingresos: monthTotals.ingresos * factor, urp: monthTotals.urp * factor },
    currentDay,
    daysInMonth,
  };
}

export type Grouping = "month" | "quarter" | "year" | "total";

export type Group = Totals & { key: string; label: string; sortKey: string };

/**
 * How a row's date maps onto the bucket it is counted in.
 *
 * The label is the only part that is not arithmetic, and it is language: the
 * translator is passed in rather than imported so a rollup computed for a
 * Spanish page cannot come back labelled "Feb 2026".
 */
export function bucketOf(
  date: Date,
  view: Grouping,
  { t, formatDate }: Translator,
): { key: string; label: string; sortKey: string } {
  const year = date.getFullYear();

  if (view === "month") {
    const month = date.getMonth();
    const formatted = formatDate(date, { month: "short", year: "numeric" });
    return {
      key: `${year}-${month}`,
      label: formatted.charAt(0).toUpperCase() + formatted.slice(1),
      sortKey: `${year}-${String(month).padStart(2, "0")}`,
    };
  }
  if (view === "quarter") {
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const key = `${year}-Q${quarter}`;
    return { key, label: `${t("dashboard.quarterShort", { n: quarter })} ${year}`, sortKey: key };
  }
  if (view === "year") {
    return { key: String(year), label: String(year), sortKey: String(year) };
  }
  return { key: "total", label: t("history.totalHistoric"), sortKey: "0" };
}

/** Folds the daily rows into periods, newest period first. */
export function groupFinanceRows(rows: FinanceRow[], view: Grouping, translator: Translator): Group[] {
  const groups = new Map<string, Group>();

  for (const row of rows) {
    const bucket = bucketOf(new Date(row.dia), view, translator);
    const group = groups.get(bucket.key) ?? { ...bucket, ...zeroTotals() };
    addRow(group, row);
    groups.set(bucket.key, group);
  }

  return [...groups.values()].sort((a, b) => view === "total" ? 0 : b.sortKey.localeCompare(a.sortKey));
}
