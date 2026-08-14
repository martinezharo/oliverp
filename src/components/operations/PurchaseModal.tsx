"use client";

import { useRef, useState } from "react";

import Modal, { useDialogOpen } from "@/components/ui/Modal";
import { fieldLabel, input } from "@/components/ui/form";
import { apiJson } from "@/lib/client-api";
import { dateOnly, today } from "@/lib/format";
import { useT } from "@/i18n/LocaleProvider";

import { FormFooter, LineItems, LoadingNotice, TotalAmountField } from "./FormParts";
import {
  emptyItem,
  itemTotal,
  orderLines,
  purchaseItemsFromRecord,
  reportSaveError,
  useExistingRecord,
  useInitData,
  type Item,
  type OperationModalProps,
  type PurchaseRecord,
} from "./shared";

const icon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21 16-4 4-4-4" />
    <path d="M17 20V4" />
    <path d="m3 8 4-4 4 4" />
    <path d="M7 4v16" />
  </svg>
);

export default function PurchaseModal({ transactionId, projectId, demo, onClose, onSaved }: OperationModalProps) {
  const { t } = useT();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  useDialogOpen(true, dialogRef, onClose);
  const editing = transactionId !== null;

  const { products } = useInitData(projectId);
  const [date, setDate] = useState(today());
  const [total, setTotal] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);

  const { loading: loadingExisting, error: loadError } = useExistingRecord<PurchaseRecord>("/api/purchases/get", {
    transactionId,
    projectId,
    demo,
    errorKey: "modal.purchase.loadError",
    onLoad: (purchase) => {
      const nextItems = purchaseItemsFromRecord(purchase.compra_detalle);
      setDate(dateOnly(purchase.fecha));
      setItems(nextItems);
      setTotal(itemTotal(nextItems));
    },
  });

  function update(index: number, key: keyof Item, value: string) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || demo || loadingExisting || loadError) return;
    const lines = orderLines(items);
    if (!lines.length) { window.alert(t("modal.sale.noLines")); return; }
    setBusy(true);
    try {
      await apiJson(editing ? "/api/purchases/update" : "/api/purchases/create", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editing ? { id: transactionId } : {}),
          projectId,
          date,
          // The purchase endpoints name the line price `unitPrice`.
          items: lines.map(({ price, ...line }) => ({ ...line, unitPrice: price })),
        }),
      });
      onSaved();
    } catch (cause) {
      reportSaveError(t, cause);
    } finally {
      setBusy(false);
    }
  }

  const estimated = Number(total || 0) > 0 ? Number(total) : Number(itemTotal(items));

  return (
    <Modal
      dialogRef={dialogRef}
      maxWidth="max-w-4xl"
      title={editing ? t("modal.purchase.editTitle", { id: transactionId ?? "" }) : t("modal.purchase.title")}
      icon={icon}
      onClose={onClose}
    >
      <form className="space-y-6 p-6" onSubmit={submit} aria-busy={loadingExisting}>
        {loadingExisting && <LoadingNotice tone="emerald" />}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <label className={fieldLabel}>
            {t("txn.colDate")}
            <input type="date" name="fecha" required value={date} onChange={(event) => setDate(event.target.value)} className={`${input} mt-2 focus:border-emerald-500`} />
          </label>

          <TotalAmountField tone="emerald" value={total} hint={t("modal.purchase.distribute")} onChange={setTotal} />
        </div>

        <LineItems
          title={t("common.products")}
          items={items}
          products={products}
          kind="purchase"
          onAdd={() => setItems((current) => [...current, emptyItem()])}
          onRemove={(index) => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
          onChange={update}
          onProductChange={(index, productId) => update(index, "productId", productId)}
        />

        <div className="flex items-center justify-between border-t border-white/5 pt-4">
          <div className="text-sm text-slate-400">{t("modal.purchase.estimatedTotal")}</div>
          <div className="text-xl font-bold text-emerald-400">{estimated.toFixed(2)} €</div>
        </div>

        <FormFooter onClose={onClose} busy={busy} disabled={loadingExisting || Boolean(loadError)} label={t("modal.purchase.save")} tone="emerald" />
      </form>
    </Modal>
  );
}
