"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { apiJson } from "@/lib/client-api";
import { ui } from "@/i18n/ui";
import { useErpContext } from "@/hooks/useErpContext";
import { useFinanceRows, useTransactions } from "@/hooks/useErpData";
import { filterTransactions } from "@/lib/transactions";

import EmptyProject from "./EmptyProject";
import Pagination from "./Pagination";
import TransactionFilters, { type FilterState } from "./TransactionFilters";
import type { FinanceRow, Transaction } from "./types";

const t = (key: string, values?: Record<string, string | number>) => {
  let value = ui.en[key] ?? key;
  for (const [name, replacement] of Object.entries(values ?? {})) value = value.replace(`{${name}}`, String(replacement));
  return value;
};
const locale = "en-GB";
const currency = (value: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(value);

const PAGE_SIZE_DAILY = 15;
const PAGE_SIZE_FLAT = 20;

function optionalAmount(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function TransactionsPage() {
  const { projectId, demo, openModal } = useErpContext();
  const onOpenModal = openModal;
  const searchParams = useSearchParams();
  const page = Math.max(1, Number.parseInt(searchParams?.get("page") || "1", 10));
  const [mode, setMode] = useState<"daily" | "list">("daily");
  const [filters, setFilters] = useState<FilterState>({ search: "", type: "", channel: "", dateFrom: "", dateTo: "", amountMin: "", amountMax: "" });
  const [flatPage, setFlatPage] = useState(1);

  const financeRows = useFinanceRows();
  // The list view subscribes to the project's transactions once; filtering and
  // paging then happen locally, so a keystroke in the filters no longer costs
  // a request.
  const allTransactions = useTransactions();

  useEffect(() => {
    try {
      const savedMode = window.localStorage.getItem("txn-view-mode");
      if (savedMode === "daily" || savedMode === "list") {
        // The previous frontend applied this preference after page load; preserve that behavior
        // without making the server-rendered HTML depend on browser storage.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMode(savedMode);
      }
    } catch {
      // Private browsing can deny access to localStorage.
    }
  }, []);

  const daily = useMemo(
    () => (financeRows ?? []).slice((page - 1) * PAGE_SIZE_DAILY, page * PAGE_SIZE_DAILY),
    [financeRows, page],
  );
  const dailyTotal = financeRows?.length ?? 0;

  const filtered = useMemo(
    () => filterTransactions(allTransactions ?? [], {
      ...filters,
      amountMin: optionalAmount(filters.amountMin),
      amountMax: optionalAmount(filters.amountMax),
    }),
    [allTransactions, filters],
  );
  const flat = useMemo(
    () => filtered.slice((flatPage - 1) * PAGE_SIZE_FLAT, flatPage * PAGE_SIZE_FLAT),
    [filtered, flatPage],
  );
  const flatTotal = filtered.length;

  function changeMode(next: "daily" | "list") {
    setMode(next);
    try { window.localStorage.setItem("txn-view-mode", next); } catch { /* private browsing */ }
  }

  function changeFilter(key: keyof FilterState, value: string) { setFilters((current) => ({ ...current, [key]: value })); setFlatPage(1); }
  function clearFilters() { setFilters({ search: "", type: "", channel: "", dateFrom: "", dateTo: "", amountMin: "", amountMax: "" }); setFlatPage(1); }

  const channels = useMemo(
    () => Array.from(new Set((allTransactions ?? []).map((item) => item.channel).filter(Boolean))).sort(),
    [allTransactions],
  );
  const loading = mode === "daily" ? financeRows === undefined : allTransactions === undefined;

  if (!projectId) return <EmptyProject />;

  return <>
    <div className="mb-6 lg:mb-8"><h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-2xl font-bold text-transparent lg:text-3xl">{t("transactions.title")}</h1><p className="mt-1 text-sm text-slate-400 lg:text-base">{t("transactions.subtitle")}</p></div>
    <TransactionFilters mode={mode} setMode={changeMode} channels={channels} filters={filters} onChange={changeFilter} onClear={clearFilters} />
    {loading ? <ListSkeleton /> : mode === "daily" ? <DailyView daily={daily} transactions={allTransactions ?? []} /> : <FlatView rows={flat} projectId={projectId} demo={demo} onOpenModal={onOpenModal} />}
    {loading ? null : mode === "daily" ? <div id="daily-pagination" className="mt-8"><Pagination currentPage={page} totalPages={Math.ceil(dailyTotal / PAGE_SIZE_DAILY)} baseUrl={`/transacciones?projectId=${projectId}`} /></div> : <FlatPager page={flatPage} total={flatTotal} onPageChange={setFlatPage} />}
  </>;
}

function ListSkeleton() {
  return <div className="animate-pulse space-y-4" aria-busy="true" aria-label={t("common.loadingData")}>{[0, 1, 2, 3, 4, 5].map((slot) => <div key={slot} className="h-24 rounded-2xl bg-white/5" />)}</div>;
}

function DailyView({ daily, transactions }: { daily: FinanceRow[]; transactions: Transaction[] }) {
  return <div id="daily-view" className="space-y-4">{daily.length === 0 ? <div className="rounded-2xl border border-white/5 bg-white/5 p-8 text-center italic text-slate-500">{t("txn.noTransactions")}</div> : daily.map((row) => <DayCard key={row.dia} row={row} transactions={transactions} />)}</div>;
}

function DayCard({ row, transactions }: { row: FinanceRow; transactions: Transaction[] }) {
  const [open, setOpen] = useState(false);
  const date = new Date(row.dia);
  // The project's transactions are already subscribed to, so expanding a day
  // is a local filter instead of a request that used to spin for a moment.
  const details = useMemo(
    () => transactions.filter((item) => item.date.slice(0, 10) === row.dia).sort((a, b) => b.id - a.id),
    [row.dia, transactions],
  );
  function toggle() { setOpen((current) => !current); }
  return <div className={`transaction-day-card group cursor-pointer overflow-hidden rounded-2xl border border-white/5 bg-[#1a1b23] p-0 transition-all hover:border-white/10 ${open ? "open" : ""}`} data-date={row.dia} data-project-id={row.proyecto_id}>
    <button type="button" onClick={toggle} className="block w-full p-4 text-left lg:p-6">
      <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition-colors group-hover:text-white lg:h-12 lg:w-12"><span className="font-mono text-base font-bold lg:text-lg">{date.getDate()}</span></div><div className="min-w-0"><h4 className="text-sm font-medium leading-tight text-white lg:text-base"><span className="block sm:hidden">{date.toLocaleDateString(locale, { month: "long", year: "numeric" })}<span className="block font-semibold">{date.toLocaleDateString(locale, { weekday: "long" })}</span></span><span className="hidden sm:block">{date.toLocaleDateString(locale, { weekday: "long", month: "long", year: "numeric" })}</span></h4><div className="mt-1 flex flex-wrap gap-2 text-xs lg:gap-3"><span className="text-emerald-400">{t("finance.income")}: +{currency(row.ingresos)}</span><span className="text-red-400">{t("finance.expenses")}: -{currency(row.gastos)}</span></div></div></div><div className="flex shrink-0 items-center gap-4 lg:gap-6"><div className="hidden text-right lg:block"><div className="text-sm text-slate-400">{t("finance.urp")}</div><div className="font-mono text-lg font-bold text-white">{currency(row.urp)}</div></div><div className="hidden text-right lg:block"><div className="text-sm text-slate-400">{t("finance.balance")}</div><div className={`text-lg font-bold ${row.balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>{row.balance >= 0 ? "+" : ""}{currency(row.balance)}</div></div><div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-400 transition-colors group-hover:bg-white/10"><svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transform transition-transform duration-300 ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg></div></div></div>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/5 pt-3 lg:hidden"><div className="rounded-xl bg-white/5 px-3 py-2"><div className="mb-0.5 text-[10px] uppercase tracking-wider text-slate-500">{t("finance.urp")}</div><div className="font-mono text-sm font-bold text-white">{currency(row.urp)}</div></div><div className={`rounded-xl px-3 py-2 ${row.balance >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}><div className="mb-0.5 text-[10px] uppercase tracking-wider text-slate-500">{t("finance.balance")}</div><div className={`font-mono text-sm font-bold ${row.balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>{row.balance >= 0 ? "+" : ""}{currency(row.balance)}</div></div></div>
    </button>
    {open && <div className="details-container border-t border-white/5 bg-[#14151a]/50"><div className="p-3 lg:p-4"><DetailsTable items={details} /></div></div>}
  </div>;
}

function DetailsTable({ items }: { items: Transaction[] }) {
  if (!items.length) return <div className="py-4 text-center text-slate-500">{t("txn.noDetails")}</div>;
  return <><div className="hidden overflow-x-auto sm:block"><table className="w-full text-left text-sm text-slate-400"><thead className="bg-white/5 text-xs uppercase text-slate-500"><tr><th className="rounded-l-lg px-4 py-3">{t("txn.colType")}</th><th className="px-4 py-3">{t("txn.colConcept")}</th><th className="px-4 py-3 text-center">{t("txn.colUnits")}</th><th className="px-4 py-3 text-right">{t("txn.colAmount")}</th><th className="px-4 py-3">{t("txn.colChannel")}</th><th className="rounded-r-lg px-4 py-3 text-center">{t("txn.colStatus")}</th></tr></thead><tbody className="divide-y divide-white/5">{items.map((item) => <TransactionRow key={`${item.type}-${item.id}`} item={item} />)}</tbody></table></div><div className="space-y-2 sm:hidden">{items.map((item) => <div key={`${item.type}-${item.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-3"><span className="min-w-0 truncate text-sm text-white">{item.concept}</span><strong className={item.amount >= 0 ? "text-emerald-400" : "text-red-400"}>{currency(item.amount)}</strong></div>)}</div></>;
}

function FlatView({ rows, projectId, demo, onOpenModal }: { rows: Transaction[]; projectId: number; demo: boolean; onOpenModal: (kind: "sale" | "purchase" | "other", id?: number) => void }) {
  const empty = rows.length === 0;
  return <div id="flat-view" data-project-id={projectId}>{empty ? <div className="rounded-2xl border border-white/5 bg-white/5 p-8 text-center italic text-slate-500">{t("txn.noTransactions")}</div> : <><div className="hidden overflow-hidden rounded-2xl border border-white/5 bg-[#1a1b23] sm:block"><table className="w-full text-left text-sm text-slate-400"><thead className="bg-white/5 text-xs uppercase text-slate-500"><tr><th className="rounded-tl-2xl px-4 py-3">{t("txn.colDate")}</th><th className="px-4 py-3">{t("txn.colType")}</th><th className="px-4 py-3">{t("txn.colConcept")}</th><th className="px-4 py-3 text-center">{t("txn.colUnits")}</th><th className="px-4 py-3 text-right">{t("txn.colAmount")}</th><th className="px-4 py-3">{t("txn.colChannel")}</th><th className="px-4 py-3 text-center">{t("txn.colStatus")}</th><th className="rounded-tr-2xl px-4 py-3 text-right">{t("txn.colActions")}</th></tr></thead><tbody className="divide-y divide-white/5">{rows.map((item) => <TransactionRow key={`${item.type}-${item.id}`} item={item} demo={demo} onOpenModal={onOpenModal} />)}</tbody></table></div><div className="space-y-2 sm:hidden">{rows.map((item) => <MobileTransaction item={item} key={`${item.type}-${item.id}`} demo={demo} onOpenModal={onOpenModal} />)}</div></>}</div>;
}

function TransactionRow({ item, demo, onOpenModal }: { item: Transaction; demo?: boolean; onOpenModal?: (kind: "sale" | "purchase" | "other", id?: number) => void }) {
  const income = item.type === "venta" || item.type === "ingreso";
  return <tr className="group/row transition-colors hover:bg-white/5"><td className="whitespace-nowrap px-4 py-3"><span className="font-mono text-xs text-slate-400">{new Date(item.date).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" })}</span></td><td className="px-4 py-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">{income ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}</div></td><td className="px-4 py-3"><div className="font-medium text-white">{item.concept}</div><div className="text-xs uppercase text-slate-500">{item.type}</div></td><td className="px-4 py-3 text-center font-mono">{item.units || "-"}</td><td className={`px-4 py-3 text-right font-mono font-bold ${income ? "text-emerald-400" : "text-red-400"}`}>{currency(Math.abs(item.amount))}</td><td className="px-4 py-3"><span className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs">{item.channel}</span></td><td className="px-4 py-3 text-center"><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${item.status === "enviada" || item.status === "completado" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"}`}>{item.status || "N/A"}</span></td><td className="px-4 py-3 text-right">{!demo && onOpenModal && <ActionButtons item={item} onOpenModal={onOpenModal} />}</td></tr>;
}

function MobileTransaction({ item, demo, onOpenModal }: { item: Transaction; demo: boolean; onOpenModal: (kind: "sale" | "purchase" | "other", id?: number) => void }) { const income = item.type === "venta" || item.type === "ingreso"; return <div className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#1a1b23] px-3 py-3"><div className="flex min-w-0 items-center gap-2.5"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">{income ? "↑" : "↓"}</div><div className="min-w-0"><div className="truncate text-sm font-medium text-white">{item.concept}</div><div className="mt-0.5 flex flex-wrap items-center gap-1.5"><span className="text-[10px] uppercase tracking-wide text-slate-500">{item.type}</span><span className="text-slate-600">·</span><span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">{item.channel}</span></div></div></div><div className="flex shrink-0 items-center gap-2"><span className={`font-mono text-sm font-bold ${income ? "text-emerald-400" : "text-red-400"}`}>{currency(Math.abs(item.amount))}</span>{!demo && <ActionButtons item={item} onOpenModal={onOpenModal} />}</div></div>; }

function ActionButtons({ item, onOpenModal }: { item: Transaction; onOpenModal: (kind: "sale" | "purchase" | "other", id?: number) => void }) {
  const edit = item.type === "venta" ? "sale" : item.type === "compra" ? "purchase" : "other";

  async function remove() {
    if (!window.confirm(t("txn.confirmDelete"))) return;
    try {
      const response = await apiJson<{ success?: boolean }>("/api/transactions/delete?id=" + item.id + "&type=" + item.type, { method: "DELETE" });
      if (!response.success) throw new Error("The transaction was not deleted");
    } catch {
      window.alert(t("txn.deleteError"));
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button type="button" onClick={() => onOpenModal(edit, item.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" title={t("common.edit")}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
      </button>
      <button type="button" onClick={() => void remove()} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/20 hover:text-red-400" title={t("common.delete")}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
      </button>
    </div>
  );
}

function FlatPager({ page, total, onPageChange }: { page: number; total: number; onPageChange: (page: number) => void }) {
  const totalPages = Math.ceil(total / 20);
  if (totalPages <= 1) return null;
  return <div id="flat-view-pager" className="mt-8"><div className="flex items-center justify-between gap-4"><button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={`flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${page <= 1 ? "cursor-not-allowed text-slate-500 opacity-40" : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"}`}>{t("pagination.previous")}</button><span className="font-mono text-sm text-slate-400">{page} / {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className={`flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${page >= totalPages ? "cursor-not-allowed text-slate-500 opacity-40" : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"}`}>{t("pagination.next")}</button></div></div>;
}
