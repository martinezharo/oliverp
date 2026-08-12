"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { t } from "@/i18n/t";
import { formatCurrency } from "@/lib/format";
import { groupFinanceRows, type Group, type Grouping } from "@/lib/finance";
import { useErpContext } from "@/hooks/useErpContext";
import { useFinanceRows } from "@/hooks/useErpData";

/** The daily finance rows rolled up over a period the user picks. */
export default function HistoryPage() {
  const { projectId } = useErpContext();
  const rows = useFinanceRows();
  const searchParams = useSearchParams();
  const view = parseGrouping(searchParams?.get("view") ?? null);
  const groups = useMemo(() => groupFinanceRows(rows ?? [], view), [rows, view]);

  const options: Array<{ value: Grouping; label: string }> = [
    { value: "month", label: t("history.viewMonths") },
    { value: "quarter", label: t("history.viewQuarters") },
    { value: "year", label: t("history.viewYears") },
    { value: "total", label: t("history.viewTotal") },
  ];

  return (
    <>
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-white">{t("history.title")}</h1>
          <p className="text-sm text-slate-400">{t("history.subtitle")}</p>
        </div>
        <div className="flex rounded-xl border border-white/5 bg-[#14151a] p-1">
          {options.map((option) => (
            <Link
              key={option.value}
              href={`/historial?projectId=${projectId}&view=${option.value}`}
              aria-current={view === option.value ? "page" : undefined}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${view === option.value ? "bg-blue-500/10 text-blue-400 shadow-sm" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      {!projectId ? (
        <div className="py-20 text-center">
          <p className="text-slate-500">{t("history.selectProject")}</p>
        </div>
      ) : rows === undefined ? (
        <div className="flex animate-pulse flex-col gap-4" aria-busy="true">
          {[0, 1, 2, 3, 4].map((slot) => <div key={slot} className="h-20 rounded-2xl bg-white/5" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="hidden rounded-xl border border-white/5 bg-[#14151a]/50 px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 md:grid md:grid-cols-6 md:gap-4">
            <div>{t("history.period")}</div>
            <div className="text-right">{t("finance.income")}</div>
            <div className="text-right">{t("finance.expenses")}</div>
            <div className="text-right">{t("finance.balance")}</div>
            <div className="text-right">{t("finance.vatBalance")}</div>
            <div className="text-right">{t("finance.urp")}</div>
          </div>
          {groups.map((group) => <HistoryRow key={group.key} group={group} />)}
        </div>
      )}
    </>
  );
}

function parseGrouping(value: string | null): Grouping {
  return value === "quarter" || value === "year" || value === "total" ? value : "month";
}

function HistoryRow({ group }: { group: Group }) {
  const positive = group.balance >= 0;

  return (
    <div className="group relative rounded-2xl border border-white/5 bg-[#14151a] p-4 transition-colors hover:border-white/10 md:px-6 md:py-4">
      <div className="flex flex-col gap-4 md:grid md:grid-cols-6 md:items-center">
        <div className="flex items-center justify-between gap-3 md:justify-start">
          <div className={`rounded-lg p-1.5 ${positive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {positive ? (
                <>
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </>
              ) : (
                <>
                  <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
                  <polyline points="16 17 22 17 22 11" />
                </>
              )}
            </svg>
          </div>
          <span className="font-medium capitalize text-white md:truncate">{group.label}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 md:contents">
          <HistoryValue label={t("finance.income")} value={formatCurrency(group.ingresos)} className="text-emerald-400" />
          <HistoryValue label={t("finance.expenses")} value={formatCurrency(group.gastos)} className="text-red-400" />
          <HistoryValue label={t("finance.balance")} value={formatCurrency(group.balance)} className={positive ? "text-white" : "text-red-400"} />
          <HistoryValue
            label={t("finance.vatBalance")}
            value={formatCurrency(group.saldo_iva)}
            title={`${t("finance.vatSupported")}: ${formatCurrency(group.iva_soportado)} | ${t("finance.vatCharged")}: ${formatCurrency(group.iva_repercutido)}`}
            className={group.saldo_iva > 0 ? "text-red-400" : group.saldo_iva < 0 ? "text-emerald-400" : "text-slate-400"}
          />
          <HistoryValue label={t("finance.urp")} value={formatCurrency(group.urp)} className={group.urp >= 0 ? "text-blue-400" : "text-red-400"} />
        </div>
      </div>
    </div>
  );
}

function HistoryValue({ label, value, className, title }: { label: string; value: string; className: string; title?: string }) {
  return (
    <div className="flex flex-col md:block md:text-right" title={title}>
      <span className="mb-1 text-xs text-slate-500 md:hidden">{label}</span>
      <span className={`font-bold ${className}`}>{value}</span>
    </div>
  );
}
