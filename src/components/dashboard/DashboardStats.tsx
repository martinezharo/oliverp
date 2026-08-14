"use client";

import { useT } from "@/i18n/LocaleProvider";
import { summarizeFinances } from "@/lib/finance";

import type { FinanceRow } from "@/types/erp";

/** Month to date, quarter to date, and a straight-line projection of the month. */
export default function DashboardStats({ transactions }: { transactions: FinanceRow[] }) {
  const { t, formatCurrency, formatInteger, formatDate } = useT();
  const now = new Date();
  const { month, quarter, projection, currentDay, daysInMonth } = summarizeFinances(transactions, now);
  const monthName = formatDate(now, { month: "long" });
  const quarterName = t("dashboard.quarterShort", { n: Math.floor(now.getMonth() / 3) + 1 });

  return (
    <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <StatCard
        tone="blue"
        title={t("dashboard.balanceMonth", { month: monthName })}
        watermark={
          <>
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </>
        }
      >
        <div className="grid grid-cols-2 gap-x-2 gap-y-4">
          <StatCell label={t("finance.income")} value={formatCurrency(month.ingresos)} className="text-emerald-400" />
          <StatCell label={t("finance.expenses")} value={formatCurrency(month.gastos)} className="text-red-400" />
          <StatCell label={t("finance.balance")} value={formatCurrency(month.balance)} className={month.balance >= 0 ? "text-white" : "text-red-400"} />
          <StatCell label={t("finance.urp")} value={formatCurrency(month.urp)} className={month.urp >= 0 ? "text-blue-400" : "text-red-400"} />
        </div>
      </StatCard>

      <StatCard
        tone="purple"
        title={t("dashboard.balanceQuarter", { quarter: quarterName })}
        watermark={
          <>
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </>
        }
      >
        <div className="grid grid-cols-2 gap-x-2 gap-y-4">
          <StatCell label={t("finance.income")} value={formatCurrency(quarter.ingresos)} className="text-emerald-400" />
          <StatCell label={t("finance.expenses")} value={formatCurrency(quarter.gastos)} className="text-red-400" />
          <div className="col-span-2">
            <StatCell label={t("finance.balance")} value={formatCurrency(quarter.balance)} className={quarter.balance >= 0 ? "text-white" : "text-red-400"} />
          </div>
          <div className="col-span-2 mt-2 border-t border-white/5 pt-2">
            <div className="mb-1 flex items-end justify-between">
              <p className="text-xs text-slate-500">{t("finance.vatBalance")}</p>
              <div className="flex gap-2 text-xs text-slate-600">
                <span title={t("dashboard.vatSupportedTip")} className="text-emerald-400/60">S: {formatInteger(quarter.iva_soportado)}€</span>
                <span title={t("dashboard.vatChargedTip")} className="text-red-400/60">R: {formatInteger(quarter.iva_repercutido)}€</span>
              </div>
            </div>
            {/* A positive VAT balance is money owed to the tax office. */}
            <p className={`text-xl font-bold ${quarter.saldo_iva > 0 ? "text-red-400" : quarter.saldo_iva < 0 ? "text-emerald-400" : "text-purple-400"}`}>
              {formatCurrency(quarter.saldo_iva)}
            </p>
          </div>
        </div>
      </StatCard>

      <StatCard
        tone="amber"
        title={t("dashboard.projection", { month: monthName })}
        watermark={
          <>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </>
        }
      >
        <div className="space-y-6">
          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <p className="text-xs text-slate-500">{t("dashboard.estimatedIncome")}</p>
              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-500/60">
                {t("dashboard.day", { current: currentDay, total: daysInMonth })}
              </span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(projection.ingresos)}</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-amber-500/50" style={{ width: `${Math.min(100, currentDay / daysInMonth * 100)}%` }} />
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs text-slate-500">{t("dashboard.estimatedUrp")}</p>
            <p className="text-2xl font-bold text-blue-400">{formatCurrency(projection.urp)}</p>
          </div>
        </div>
      </StatCard>
    </div>
  );
}

const dotTone = { blue: "bg-blue-500", purple: "bg-purple-500", amber: "bg-amber-500" };
const watermarkTone = { blue: "text-blue-500", purple: "text-purple-500", amber: "text-amber-500" };

function StatCard({
  tone,
  title,
  watermark,
  children,
}: {
  tone: keyof typeof dotTone;
  title: string;
  watermark: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/5 bg-[#14151a] p-6">
      <div className="absolute right-0 top-0 p-6 opacity-5 transition-opacity group-hover:opacity-10">
        <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={watermarkTone[tone]}>
          {watermark}
        </svg>
      </div>
      <div className="relative z-10">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-slate-400">
          <span className={`h-2 w-2 rounded-full ${dotTone[tone]}`} />
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

function StatCell({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div>
      <p className="mb-1 text-xs text-slate-500">{label}</p>
      <p className={`text-lg font-bold ${className}`}>{value}</p>
    </div>
  );
}
