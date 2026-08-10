"use client";

import { ui } from "@/i18n/ui";

import type { FinanceRow } from "./types";

const t = (key: string, values?: Record<string, string | number>) => {
  let value = ui.en[key] ?? key;
  for (const [name, replacement] of Object.entries(values ?? {})) value = value.replace(`{${name}}`, String(replacement));
  return value;
};

export default function DashboardStats({ transactions }: { transactions: FinanceRow[] }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startOfQuarterMonth = Math.floor(currentMonth / 3) * 3;
  const startOfQuarter = new Date(currentYear, startOfQuarterMonth, 1);
  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const quarterRows = transactions.filter((row) => new Date(row.dia) >= startOfQuarter);

  const stats = {
    month: { ingresos: 0, gastos: 0, balance: 0, urp: 0 },
    quarter: { ingresos: 0, gastos: 0, balance: 0, saldo_iva: 0, iva_soportado: 0, iva_repercutido: 0 },
    prediction: { ingresos: 0, urp: 0 },
  };

  for (const row of quarterRows) {
    stats.quarter.ingresos += row.ingresos || 0;
    stats.quarter.gastos += row.gastos || 0;
    stats.quarter.balance += row.balance || 0;
    stats.quarter.saldo_iva += row.saldo_iva || 0;
    stats.quarter.iva_soportado += row.iva_soportado || 0;
    stats.quarter.iva_repercutido += row.iva_repercutido || 0;
    if (new Date(row.dia) >= startOfMonth) {
      stats.month.ingresos += row.ingresos || 0;
      stats.month.gastos += row.gastos || 0;
      stats.month.balance += row.balance || 0;
      stats.month.urp += row.urp || 0;
    }
  }

  const projectionFactor = daysInMonth / Math.max(1, currentDay);
  stats.prediction.ingresos = stats.month.ingresos * projectionFactor;
  stats.prediction.urp = stats.month.urp * projectionFactor;
  const locale = "en-GB";
  const formatCurrency = (value: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(value);
  const formatNumber = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
  const monthName = new Intl.DateTimeFormat(locale, { month: "long" }).format(now);
  const quarterName = t("dashboard.quarterShort", { n: Math.floor(currentMonth / 3) + 1 });

  return (
    <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="group relative overflow-hidden rounded-3xl border border-white/5 bg-[#14151a] p-6">
        <div className="absolute right-0 top-0 p-6 opacity-5 transition-opacity group-hover:opacity-10">
          <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
        </div>
        <div className="relative z-10">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-slate-400"><span className="h-2 w-2 rounded-full bg-blue-500" />{t("dashboard.balanceMonth", { month: monthName })}</h3>
          <div className="grid grid-cols-2 gap-x-2 gap-y-4">
            <StatCell label={t("finance.income")} value={formatCurrency(stats.month.ingresos)} className="text-emerald-400" />
            <StatCell label={t("finance.expenses")} value={formatCurrency(stats.month.gastos)} className="text-red-400" />
            <StatCell label={t("finance.balance")} value={formatCurrency(stats.month.balance)} className={stats.month.balance >= 0 ? "text-white" : "text-red-400"} />
            <StatCell label={t("finance.urp")} value={formatCurrency(stats.month.urp)} className={stats.month.urp >= 0 ? "text-blue-400" : "text-red-400"} />
          </div>
        </div>
      </div>

      <div className="group relative overflow-hidden rounded-3xl border border-white/5 bg-[#14151a] p-6">
        <div className="absolute right-0 top-0 p-6 opacity-5 transition-opacity group-hover:opacity-10"><svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg></div>
        <div className="relative z-10">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-slate-400"><span className="h-2 w-2 rounded-full bg-purple-500" />{t("dashboard.balanceQuarter", { quarter: quarterName })}</h3>
          <div className="grid grid-cols-2 gap-x-2 gap-y-4">
            <StatCell label={t("finance.income")} value={formatCurrency(stats.quarter.ingresos)} className="text-emerald-400" />
            <StatCell label={t("finance.expenses")} value={formatCurrency(stats.quarter.gastos)} className="text-red-400" />
            <div className="col-span-2"><StatCell label={t("finance.balance")} value={formatCurrency(stats.quarter.balance)} className={stats.quarter.balance >= 0 ? "text-white" : "text-red-400"} /></div>
            <div className="col-span-2 mt-2 border-t border-white/5 pt-2">
              <div className="mb-1 flex items-end justify-between"><p className="text-xs text-slate-500">{t("finance.vatBalance")}</p><div className="flex gap-2 text-xs text-slate-600"><span title={t("dashboard.vatSupportedTip")} className="text-emerald-400/60">S: {formatNumber(stats.quarter.iva_soportado)}€</span><span title={t("dashboard.vatChargedTip")} className="text-red-400/60">R: {formatNumber(stats.quarter.iva_repercutido)}€</span></div></div>
              <p className={`text-xl font-bold ${stats.quarter.saldo_iva > 0 ? "text-red-400" : stats.quarter.saldo_iva < 0 ? "text-emerald-400" : "text-purple-400"}`}>{formatCurrency(stats.quarter.saldo_iva)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="group relative overflow-hidden rounded-3xl border border-white/5 bg-[#14151a] p-6">
        <div className="absolute right-0 top-0 p-6 opacity-5 transition-opacity group-hover:opacity-10"><svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg></div>
        <div className="relative z-10">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-slate-400"><span className="h-2 w-2 rounded-full bg-amber-500" />{t("dashboard.projection", { month: monthName })}</h3>
          <div className="space-y-6">
            <div><div className="mb-1 flex items-baseline justify-between"><p className="text-xs text-slate-500">{t("dashboard.estimatedIncome")}</p><span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-500/60">{t("dashboard.day", { current: currentDay, total: daysInMonth })}</span></div><p className="text-2xl font-bold text-white">{formatCurrency(stats.prediction.ingresos)}</p><div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-amber-500/50" style={{ width: `${Math.min(100, currentDay / daysInMonth * 100)}%` }} /></div></div>
            <div><p className="mb-1 text-xs text-slate-500">{t("dashboard.estimatedUrp")}</p><p className="text-2xl font-bold text-blue-400">{formatCurrency(stats.prediction.urp)}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value, className }: { label: string; value: string; className: string }) {
  return <div><p className="mb-1 text-xs text-slate-500">{label}</p><p className={`text-lg font-bold ${className}`}>{value}</p></div>;
}
