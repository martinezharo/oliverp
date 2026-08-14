"use client";

import { useT } from "@/i18n/LocaleProvider";

import TransactionRow, { ActionButtons, isIncome, type OpenModal } from "./TransactionRow";

import type { Transaction } from "@/types/erp";

export const PAGE_SIZE_FLAT = 20;

/** Every transaction in one list: a table on wide screens, cards on phones. */
export default function FlatView({
  rows,
  demo,
  onOpenModal,
}: {
  rows: Transaction[];
  demo: boolean;
  onOpenModal: OpenModal;
}) {
  const { t } = useT();
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/5 p-8 text-center italic text-slate-500">
        {t("txn.noTransactions")}
      </div>
    );
  }

  return (
    <div>
      <div className="hidden overflow-hidden rounded-2xl border border-white/5 bg-[#1a1b23] sm:block">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="bg-white/5 text-xs uppercase text-slate-500">
            <tr>
              <th className="rounded-tl-2xl px-4 py-3">{t("txn.colDate")}</th>
              <th className="px-4 py-3">{t("txn.colType")}</th>
              <th className="px-4 py-3">{t("txn.colConcept")}</th>
              <th className="px-4 py-3 text-center">{t("txn.colUnits")}</th>
              <th className="px-4 py-3 text-right">{t("txn.colAmount")}</th>
              <th className="px-4 py-3">{t("txn.colChannel")}</th>
              <th className="rounded-tr-2xl px-4 py-3 text-right">{t("txn.colActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((item) => (
              <TransactionRow key={`${item.type}-${item.id}`} item={item} demo={demo} onOpenModal={onOpenModal} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 sm:hidden">
        {rows.map((item) => (
          <MobileTransaction key={`${item.type}-${item.id}`} item={item} demo={demo} onOpenModal={onOpenModal} />
        ))}
      </div>
    </div>
  );
}

function MobileTransaction({ item, demo, onOpenModal }: { item: Transaction; demo: boolean; onOpenModal: OpenModal }) {
  const { formatCurrency } = useT();
  const income = isIncome(item);

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#1a1b23] px-3 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">{income ? "↑" : "↓"}</div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-white">{item.concept}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">{item.type}</span>
            <span className="text-slate-600">·</span>
            <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">{item.channel}</span>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`font-mono text-sm font-bold ${income ? "text-emerald-400" : "text-red-400"}`}>
          {formatCurrency(Math.abs(item.amount))}
        </span>
        {!demo && <ActionButtons item={item} onOpenModal={onOpenModal} />}
      </div>
    </div>
  );
}

/**
 * Paging for the list view. It is local state rather than a URL page, because
 * the filters it pages through are local too.
 */
export function FlatPager({ page, total, onPageChange }: { page: number; total: number; onPageChange: (page: number) => void }) {
  const { t } = useT();
  const totalPages = Math.ceil(total / PAGE_SIZE_FLAT);
  if (totalPages <= 1) return null;

  const step = "flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors";
  const enabled = "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10";
  const disabled = "cursor-not-allowed text-slate-500 opacity-40";

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between gap-4">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={`${step} ${page <= 1 ? disabled : enabled}`}>
          {t("pagination.previous")}
        </button>
        <span className="font-mono text-sm text-slate-400">{page} / {totalPages}</span>
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className={`${step} ${page >= totalPages ? disabled : enabled}`}>
          {t("pagination.next")}
        </button>
      </div>
    </div>
  );
}
