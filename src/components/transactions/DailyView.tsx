"use client";

import { useMemo, useState } from "react";

import { useT } from "@/i18n/LocaleProvider";

import TransactionRow from "./TransactionRow";

import type { FinanceRow, Transaction } from "@/types/erp";

/** One expandable card per day, newest first. */
export default function DailyView({ daily, transactions }: { daily: FinanceRow[]; transactions: Transaction[] }) {
  const { t } = useT();
  return (
    <div className="space-y-4">
      {daily.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/5 p-8 text-center italic text-slate-500">
          {t("txn.noTransactions")}
        </div>
      ) : daily.map((row) => <DayCard key={row.dia} row={row} transactions={transactions} />)}
    </div>
  );
}

function DayCard({ row, transactions }: { row: FinanceRow; transactions: Transaction[] }) {
  const { t, formatCurrency, formatDate } = useT();
  const [open, setOpen] = useState(false);
  const date = new Date(row.dia);
  const positive = row.balance >= 0;

  // The project's transactions are already subscribed to, so expanding a day
  // is a local filter instead of a request that used to spin for a moment.
  const details = useMemo(
    () => transactions.filter((item) => item.date.slice(0, 10) === row.dia).sort((a, b) => b.id - a.id),
    [row.dia, transactions],
  );

  return (
    <div className="group cursor-pointer overflow-hidden rounded-2xl border border-white/5 bg-[#1a1b23] p-0 transition-all hover:border-white/10">
      <button type="button" onClick={() => setOpen((current) => !current)} className="block w-full p-4 text-left lg:p-6" aria-expanded={open}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition-colors group-hover:text-white lg:h-12 lg:w-12">
              <span className="font-mono text-base font-bold lg:text-lg">{date.getDate()}</span>
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-medium leading-tight text-white lg:text-base">
                <span className="block sm:hidden">
                  {formatDate(date, { month: "long", year: "numeric" })}
                  <span className="block font-semibold">{formatDate(date, { weekday: "long" })}</span>
                </span>
                <span className="hidden sm:block">{formatDate(date, { weekday: "long", month: "long", year: "numeric" })}</span>
              </h4>
              <div className="mt-1 flex flex-wrap gap-2 text-xs lg:gap-3">
                <span className="text-emerald-400">{t("finance.income")}: +{formatCurrency(row.ingresos)}</span>
                <span className="text-red-400">{t("finance.expenses")}: -{formatCurrency(row.gastos)}</span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4 lg:gap-6">
            <div className="hidden text-right lg:block">
              <div className="text-sm text-slate-400">{t("finance.urp")}</div>
              <div className="font-mono text-lg font-bold text-white">{formatCurrency(row.urp)}</div>
            </div>
            <div className="hidden text-right lg:block">
              <div className="text-sm text-slate-400">{t("finance.balance")}</div>
              <div className={`text-lg font-bold ${positive ? "text-emerald-400" : "text-red-400"}`}>
                {positive ? "+" : ""}{formatCurrency(row.balance)}
              </div>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-400 transition-colors group-hover:bg-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transform transition-transform duration-300 ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* The wide layout shows these two figures in the header row instead. */}
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/5 pt-3 lg:hidden">
          <div className="rounded-xl bg-white/5 px-3 py-2">
            <div className="mb-0.5 text-[10px] uppercase tracking-wider text-slate-500">{t("finance.urp")}</div>
            <div className="font-mono text-sm font-bold text-white">{formatCurrency(row.urp)}</div>
          </div>
          <div className={`rounded-xl px-3 py-2 ${positive ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
            <div className="mb-0.5 text-[10px] uppercase tracking-wider text-slate-500">{t("finance.balance")}</div>
            <div className={`font-mono text-sm font-bold ${positive ? "text-emerald-400" : "text-red-400"}`}>
              {positive ? "+" : ""}{formatCurrency(row.balance)}
            </div>
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-white/5 bg-[#14151a]/50">
          <div className="p-3 lg:p-4"><DetailsTable items={details} /></div>
        </div>
      )}
    </div>
  );
}

function DetailsTable({ items }: { items: Transaction[] }) {
  const { t, formatCurrency } = useT();
  if (!items.length) return <div className="py-4 text-center text-slate-500">{t("txn.noDetails")}</div>;

  return (
    <>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="bg-white/5 text-xs uppercase text-slate-500">
            <tr>
              <th className="rounded-l-lg px-4 py-3">{t("txn.colType")}</th>
              <th className="px-4 py-3">{t("txn.colConcept")}</th>
              <th className="px-4 py-3 text-center">{t("txn.colUnits")}</th>
              <th className="px-4 py-3 text-right">{t("txn.colAmount")}</th>
              <th className="rounded-r-lg px-4 py-3">{t("txn.colChannel")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.map((item) => <TransactionRow key={`${item.type}-${item.id}`} item={item} />)}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 sm:hidden">
        {items.map((item) => (
          <div key={`${item.type}-${item.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-3">
            <span className="min-w-0 truncate text-sm text-white">{item.concept}</span>
            <strong className={item.amount >= 0 ? "text-emerald-400" : "text-red-400"}>{formatCurrency(item.amount)}</strong>
          </div>
        ))}
      </div>
    </>
  );
}
