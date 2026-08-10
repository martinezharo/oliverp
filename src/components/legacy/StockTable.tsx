"use client";

import { useMemo, useState } from "react";

import { ui } from "@/i18n/ui";
import { getProductNameKey } from "@/lib/mock-data";

import type { StockRow } from "./types";

const t = (key: string, values?: Record<string, string | number>) => {
  let value = ui.en[key] ?? key;
  for (const [name, replacement] of Object.entries(values ?? {})) value = value.replace(`{${name}}`, String(replacement));
  return value;
};

const locale = "en-GB";
const formatCurrency = (value: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(value);
const formatNumber = (value: number) => new Intl.NumberFormat(locale).format(value);

export default function StockTable({ data, onOpenHistory }: { data: StockRow[]; onOpenHistory: (product: StockRow) => void }) {
  const [sort, setSort] = useState<{ column: SortColumn; direction: "asc" | "desc" }>({ column: "name", direction: "asc" });
  const sorted = useMemo(() => [...data].sort((a, b) => {
    const av = sortValue(a, sort.column);
    const bv = sortValue(b, sort.column);
    const comparison = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sort.direction === "asc" ? comparison : -comparison;
  }), [data, sort]);

  function changeSort(column: SortColumn) {
    setSort((current) => current.column === column ? { column, direction: current.direction === "asc" ? "desc" : "asc" } : { column, direction: column === "name" ? "asc" : "desc" });
  }

  const totalUnits = data.reduce((sum, item) => sum + item.stock_actual, 0);
  const totalValue = data.reduce((sum, item) => sum + item.valor_stock, 0);
  const totalPurchaseValue = data.reduce((sum, item) => sum + item.stock_actual * item.coste_ud, 0);

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard tone="blue" label={t("stock.totalProducts")} value={formatNumber(data.length)} />
        <SummaryCard tone="purple" label={t("stock.unitsInStock")} value={formatNumber(totalUnits)} />
        <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#14151a]/50 p-6 shadow-lg backdrop-blur-xl"><div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" /><div className="relative z-10"><p className="mb-3 text-sm font-medium text-slate-400">{t("stock.totalValue")}</p><div className="flex flex-wrap items-baseline gap-3"><div><span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">{t("stock.totalSaleValue")}</span><span className="text-2xl font-bold tracking-tight text-emerald-400">{formatCurrency(totalValue)}</span></div><div><span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">{t("stock.totalPurchaseValue")}</span><span className="text-2xl font-bold tracking-tight text-slate-300">{formatCurrency(totalPurchaseValue)}</span></div></div></div></div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#14151a]/50 shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400" id="stock-table">
            <thead className="bg-white/5 text-xs font-semibold uppercase text-slate-200"><tr>
              <SortHeader column="name" label={t("stock.colProduct")} sort={sort} onClick={changeSort} />
              <SortHeader column="stock" label={t("stock.colStock")} sort={sort} onClick={changeSort} align="right" />
              <SortHeader column="value" label={t("stock.colValue")} sort={sort} onClick={changeSort} align="right" />
              <th scope="col" className="px-6 py-4 text-right">{t("stock.colUnit")}</th>
              <SortHeader column="profit_u" label={t("stock.colProfitU")} sort={sort} onClick={changeSort} align="right" accent />
              <SortHeader column="profit_30d" label={t("stock.colProfit30")} sort={sort} onClick={changeSort} align="right" />
              <SortHeader column="status" label={t("stock.colStatus")} sort={sort} onClick={changeSort} align="center" />
            </tr></thead>
            <tbody className="divide-y divide-white/5">
              {sorted.length === 0 ? <tr><td colSpan={7} className="px-6 py-12 text-center italic text-slate-500">{t("stock.noData")}</td></tr> : sorted.map((item) => {
                const status = statusFor(item);
                return <tr key={item.producto_id} className="group transition-colors hover:bg-white/5">
                  <td className="px-6 py-4 font-medium text-white"><button type="button" onClick={() => onOpenHistory(item)} className="text-left transition-colors hover:text-primary-400 hover:underline">{t(getProductNameKey(item.nombre_producto))}</button></td>
                  <td className="px-6 py-4 text-right font-mono text-slate-200">{formatNumber(item.stock_actual)}</td>
                  <td className="px-6 py-4 text-right font-mono text-white">{formatCurrency(item.valor_stock)}</td>
                  <td className="px-6 py-4 text-right font-mono"><div className="flex flex-col items-end gap-0.5"><span className="text-xs text-slate-500">{t("stock.buyLabel")} {formatCurrency(item.coste_ud)}</span><span className="text-slate-300">{t("stock.sellLabel")} {formatCurrency(item.venta_ud)}</span></div></td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-primary-400">{formatCurrency(item.beneficio_ud)}</td>
                  <td className="px-6 py-4 text-right font-mono text-emerald-400">{formatCurrency(item.beneficio_total_30d)}</td>
                  <td className="px-6 py-4 text-center">{status}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

type SortColumn = "name" | "stock" | "value" | "profit_u" | "profit_30d" | "status";

function sortValue(item: StockRow, column: SortColumn): string | number {
  if (column === "name") return item.nombre_producto;
  if (column === "stock") return item.stock_actual;
  if (column === "value") return item.valor_stock;
  if (column === "profit_u") return item.beneficio_ud;
  if (column === "profit_30d") return item.beneficio_total_30d;
  if (item.stock_actual <= 0) return -1;
  return item.dias_stock_restante ?? 999999;
}

function statusFor(item: StockRow) {
  const days = item.dias_stock_restante;
  if (item.stock_actual <= 0) return <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-500 ring-1 ring-inset ring-red-500/20">{t("stock.outOfStock")}</span>;
  if (days == null) return <span className="inline-flex items-center rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-500/20">{t("stock.noStatus")}</span>;
  const tone = days < 7 ? "bg-red-500/10 text-red-500" : days < 30 ? "bg-yellow-500/10 text-yellow-500" : "bg-green-500/10 text-green-500";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ring-current/20 ${tone}`}>{days > 365 ? t("stock.overYear") : t("stock.days", { n: Math.round(days) })}</span>;
}

function SortHeader({ column, label, sort, onClick, align = "left", accent = false }: { column: SortColumn; label: string; sort: { column: SortColumn; direction: "asc" | "desc" }; onClick: (column: SortColumn) => void; align?: "left" | "right" | "center"; accent?: boolean }) {
  const active = sort.column === column;
  return <th scope="col" className={`group/th cursor-pointer select-none px-6 py-4 transition-colors hover:text-white ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"} ${accent ? "text-primary-400" : ""}`} onClick={() => onClick(column)}><div className={`flex items-center gap-2 ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : ""}`}>{label}<svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-slate-600 transition-colors group-hover/th:text-slate-400 ${active ? "text-primary-400 opacity-100" : "opacity-0 group-hover/th:opacity-100"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" /></svg></div></th>;
}

function SummaryCard({ tone, label, value }: { tone: "blue" | "purple"; label: string; value: string }) {
  return <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#14151a]/50 p-6 shadow-lg backdrop-blur-xl"><div className={`absolute inset-0 bg-gradient-to-br ${tone === "blue" ? "from-blue-500/10" : "from-purple-500/10"} via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100`} /><div className="relative z-10"><p className="mb-1 text-sm font-medium text-slate-400">{label}</p><p className="text-3xl font-bold tracking-tight text-white">{value}</p></div></div>;
}
