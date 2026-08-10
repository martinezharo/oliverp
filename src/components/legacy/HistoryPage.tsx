"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { apiJson } from "@/lib/client-api";
import { mockFinanzas } from "@/lib/mock-data";
import { ui } from "@/i18n/ui";

import { toFinanceRow, type FinanceApiRow } from "./apiRows";
import type { FinanceRow } from "./types";

const t = (key: string, values?: Record<string, string | number>) => { let value = ui.en[key] ?? key; for (const [name, replacement] of Object.entries(values ?? {})) value = value.replace(`{${name}}`, String(replacement)); return value; };
const locale = "en-GB";
const currency = (value: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(value);
type Grouping = "month" | "quarter" | "year" | "total";
type Group = { key: string; label: string; sortKey: string; ingresos: number; gastos: number; balance: number; urp: number; iva_soportado: number; iva_repercutido: number; saldo_iva: number };

export default function HistoryPage({ projectId, demo, reloadKey }: { projectId: number; demo: boolean; reloadKey: number }) {
  const [rows, setRows] = useState<FinanceRow[]>([]);
  const searchParams = useSearchParams();
  const view = parseGrouping(searchParams?.get("view") ?? null);
  useEffect(() => { let cancelled = false; void (demo ? Promise.resolve(mockFinanzas.filter((row) => row.proyecto_id === projectId).sort((a, b) => b.dia.localeCompare(a.dia))) : apiJson<{ data: FinanceApiRow[] }>(`/api/v1/finanzas?proyecto_id=${projectId}`).then((body) => (body.data ?? []).map(toFinanceRow))).then((data) => { if (!cancelled) setRows(data); }).catch(() => { if (!cancelled) setRows([]); }); return () => { cancelled = true; }; }, [demo, projectId, reloadKey]);
  const groups = useMemo(() => groupRows(rows, view), [rows, view]);
  const options: Array<{ value: Grouping; label: string }> = [{ value: "month", label: t("history.viewMonths") }, { value: "quarter", label: t("history.viewQuarters") }, { value: "year", label: t("history.viewYears") }, { value: "total", label: t("history.viewTotal") }];
  return <>
    <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center"><div><h1 className="mb-2 text-2xl font-bold text-white">{t("history.title")}</h1><p className="text-sm text-slate-400">{t("history.subtitle")}</p></div><div className="flex rounded-xl border border-white/5 bg-[#14151a] p-1">{options.map((option) => <Link key={option.value} href={`/historial?projectId=${projectId}&view=${option.value}`} className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${view === option.value ? "bg-blue-500/10 text-blue-400 shadow-sm" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>{option.label}</Link>)}</div></div>
    {!projectId ? <div className="py-20 text-center"><p className="text-slate-500">{t("history.selectProject")}</p></div> : <div className="flex flex-col gap-4"><div className="hidden rounded-xl border border-white/5 bg-[#14151a]/50 px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 md:grid md:grid-cols-6 md:gap-4"><div>{t("history.period")}</div><div className="text-right">{t("finance.income")}</div><div className="text-right">{t("finance.expenses")}</div><div className="text-right">{t("finance.balance")}</div><div className="text-right">{t("finance.vatBalance")}</div><div className="text-right">{t("finance.urp")}</div></div>{groups.map((group) => <HistoryRow key={group.key} group={group} />)}</div>}
  </>;
}

function parseGrouping(value: string | null): Grouping { return value === "quarter" || value === "year" || value === "total" ? value : "month"; }

function groupRows(rows: FinanceRow[], view: Grouping): Group[] {
  const map = new Map<string, Group>();
  for (const row of rows) {
    const date = new Date(row.dia); const year = date.getFullYear(); let key = ""; let label = ""; let sortKey = "";
    if (view === "month") { const month = date.getMonth(); key = `${year}-${month}`; const formatted = new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(date); label = formatted.charAt(0).toUpperCase() + formatted.slice(1); sortKey = `${year}-${String(month).padStart(2, "0")}`; }
    else if (view === "quarter") { const quarter = Math.floor(date.getMonth() / 3) + 1; key = `${year}-Q${quarter}`; label = `${t("dashboard.quarterShort", { n: quarter })} ${year}`; sortKey = key; }
    else if (view === "year") { key = String(year); label = String(year); sortKey = key; }
    else { key = "total"; label = t("history.totalHistoric"); sortKey = "0"; }
    const group = map.get(key) ?? { key, label, sortKey, ingresos: 0, gastos: 0, balance: 0, urp: 0, iva_soportado: 0, iva_repercutido: 0, saldo_iva: 0 };
    group.ingresos += row.ingresos || 0; group.gastos += row.gastos || 0; group.balance += row.balance || 0; group.urp += row.urp || 0; group.iva_soportado += row.iva_soportado || 0; group.iva_repercutido += row.iva_repercutido || 0; group.saldo_iva += row.saldo_iva || 0; map.set(key, group);
  }
  return [...map.values()].sort((a, b) => view === "total" ? 0 : b.sortKey.localeCompare(a.sortKey));
}

function HistoryRow({ group }: { group: Group }) {
  return <div className="group relative rounded-2xl border border-white/5 bg-[#14151a] p-4 transition-colors hover:border-white/10 md:px-6 md:py-4"><div className="flex flex-col gap-4 md:grid md:grid-cols-6 md:items-center"><div className="flex items-center justify-between gap-3 md:justify-start"><div className={`rounded-lg p-1.5 ${group.balance >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>{group.balance >= 0 ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7" /><polyline points="16 17 22 17 22 11" /></svg>}</div><span className="font-medium capitalize text-white md:truncate">{group.label}</span></div><div className="grid grid-cols-2 gap-4 md:contents"><HistoryValue label={t("finance.income")} value={currency(group.ingresos)} className="text-emerald-400" /><HistoryValue label={t("finance.expenses")} value={currency(group.gastos)} className="text-red-400" /><HistoryValue label={t("finance.balance")} value={currency(group.balance)} className={group.balance >= 0 ? "text-white" : "text-red-400"} /><HistoryValue label={t("finance.vatBalance")} value={currency(group.saldo_iva)} title={`${t("finance.vatSupported")}: ${currency(group.iva_soportado)} | ${t("finance.vatCharged")}: ${currency(group.iva_repercutido)}`} className={group.saldo_iva > 0 ? "text-red-400" : group.saldo_iva < 0 ? "text-emerald-400" : "text-slate-400"} /><HistoryValue label={t("finance.urp")} value={currency(group.urp)} className={group.urp >= 0 ? "text-blue-400" : "text-red-400"} /></div></div></div>;
}

function HistoryValue({ label, value, className, title }: { label: string; value: string; className: string; title?: string }) { return <div className="flex flex-col md:block md:text-right" title={title}><span className="mb-1 text-xs text-slate-500 md:hidden">{label}</span><span className={`font-bold ${className}`}>{value}</span></div>; }
