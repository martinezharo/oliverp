"use client";

import { apiJson } from "@/lib/client-api";
import { useT } from "@/i18n/LocaleProvider";
import { useErpContext, type ModalKind } from "@/hooks/useErpContext";
import { transactionDeleteUrl } from "@/lib/transactions";

import type { Transaction } from "@/types/erp";

export type OpenModal = (kind: Exclude<ModalKind, null>, id?: number) => void;

/** Money coming in reads green; money going out reads red, everywhere. */
export const isIncome = (transaction: Transaction) => transaction.type === "venta" || transaction.type === "ingreso";

/** Which form edits this transaction. */
const editorFor = (type: string) => type === "venta" ? "sale" : type === "compra" ? "purchase" : "other";

export function DirectionIcon({ income }: { income: boolean }) {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
      {income ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
    </div>
  );
}

/** One transaction as a table row. The day detail panels omit the actions. */
export default function TransactionRow({
  item,
  demo,
  onOpenModal,
}: {
  item: Transaction;
  demo?: boolean;
  onOpenModal?: OpenModal;
}) {
  const { formatCurrency, formatDate } = useT();
  const income = isIncome(item);

  return (
    <tr className="group/row transition-colors hover:bg-white/5">
      <td className="whitespace-nowrap px-4 py-3">
        <span className="font-mono text-xs text-slate-400">
          {formatDate(item.date, { weekday: "short", day: "numeric", month: "short" })}
        </span>
      </td>
      <td className="px-4 py-3"><DirectionIcon income={income} /></td>
      <td className="px-4 py-3">
        <div className="font-medium text-white">{item.concept}</div>
        <div className="text-xs uppercase text-slate-500">{item.type}</div>
      </td>
      <td className="px-4 py-3 text-center font-mono">{item.units || "-"}</td>
      <td className={`px-4 py-3 text-right font-mono font-bold ${income ? "text-emerald-400" : "text-red-400"}`}>
        {formatCurrency(Math.abs(item.amount))}
      </td>
      <td className="px-4 py-3">
        <span className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs">{item.channel}</span>
      </td>
      <td className="px-4 py-3 text-right">
        {!demo && onOpenModal && <ActionButtons item={item} onOpenModal={onOpenModal} />}
      </td>
    </tr>
  );
}

/** Edit and delete. Deleting is confirmed, and Convex pushes the removal. */
export function ActionButtons({ item, onOpenModal }: { item: Transaction; onOpenModal: OpenModal }) {
  const { t } = useT();
  const { projectId } = useErpContext();

  async function remove() {
    if (!window.confirm(t("txn.confirmDelete"))) return;
    try {
      if (!projectId) throw new Error("No project selected");
      const response = await apiJson<{ success?: boolean }>(transactionDeleteUrl(projectId, item), { method: "DELETE" });
      if (!response.success) throw new Error("The transaction was not deleted");
    } catch {
      window.alert(t("txn.deleteError"));
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => onOpenModal(editorFor(item.type), item.id)}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
        title={t("common.edit")}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => void remove()}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
        title={t("common.delete")}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}
