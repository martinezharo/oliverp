"use client";

import { useRef, useState } from "react";

import Modal, { useDialogOpen } from "@/components/ui/Modal";
import { fieldLabel, input } from "@/components/ui/form";
import { apiJson } from "@/lib/client-api";
import { dateOnly, today } from "@/lib/format";
import { useT } from "@/i18n/LocaleProvider";

import { FormFooter, LineItems, LoadingNotice, TotalAmountField } from "./FormParts";
import {
  distributeTotal,
  emptyItem,
  itemTotal,
  orderLines,
  saleItemsFromRecord,
  useExistingRecord,
  useInitData,
  reportSaveError,
  type Item,
  type OperationModalProps,
  type SaleRecord,
} from "./shared";

const icon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="21" r="1" />
    <circle cx="19" cy="21" r="1" />
    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
  </svg>
);

export default function SaleModal({ transactionId, projectId, demo, onClose, onSaved }: OperationModalProps) {
  const { t } = useT();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  useDialogOpen(true, dialogRef, onClose);
  const editing = transactionId !== null;

  const { products, channels } = useInitData(projectId);
  const [date, setDate] = useState(today());
  const [channel, setChannel] = useState("");
  const [total, setTotal] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);

  const { loading: loadingExisting, error: loadError } = useExistingRecord<SaleRecord>("/api/sales/get", {
    transactionId,
    projectId,
    demo,
    errorKey: "modal.sale.loadError",
    onLoad: (sale) => {
      const nextItems = saleItemsFromRecord(sale.venta_detalle);
      setDate(dateOnly(sale.fecha));
      setChannel(sale.canal);
      setItems(nextItems);
      setTotal(itemTotal(nextItems));
    },
  });

  function update(index: number, key: keyof Item, value: string) {
    setItems((current) => distributeTotal(
      current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
      // A hand-typed price is authoritative: redistributing would overwrite it.
      key === "price" ? "" : total,
      products,
    ));
  }

  function chooseProduct(index: number, value: string) {
    const product = products.find((item) => String(item.id) === value);
    setItems((current) => distributeTotal(
      current.map((item, itemIndex) => itemIndex === index
        ? { ...item, productId: value, price: product ? String(product.price || "") : item.price }
        : item),
      total,
      products,
    ));
  }

  function changeTotal(value: string) {
    setTotal(value);
    setItems((current) => distributeTotal(current, value, products));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || demo || loadingExisting || loadError) return;
    const lines = orderLines(items);
    if (!lines.length) { window.alert(t("modal.sale.noLines")); return; }
    setBusy(true);
    try {
      await apiJson(editing ? "/api/sales/update" : "/api/sales/create", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(editing ? { id: transactionId } : {}), projectId, date, channel, items: lines }),
      });
      onSaved();
    } catch (cause) {
      reportSaveError(t, cause);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      dialogRef={dialogRef}
      maxWidth="max-w-4xl"
      title={editing ? t("modal.sale.editTitle", { id: transactionId ?? "" }) : t("modal.sale.title")}
      icon={icon}
      onClose={onClose}
    >
      <form className="space-y-6 p-6" onSubmit={submit} aria-busy={loadingExisting}>
        {loadingExisting && <LoadingNotice tone="indigo" />}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <label className={fieldLabel}>
            {t("txn.colDate")}
            <input type="date" name="fecha" required value={date} onChange={(event) => setDate(event.target.value)} className={`${input} mt-2 focus:border-indigo-500`} />
          </label>

          <label className={fieldLabel}>
            {t("modal.sale.channel")}
            <input
              list="sale-channel-list"
              required
              value={channel}
              onChange={(event) => setChannel(event.target.value)}
              placeholder={t("modal.sale.channelPlaceholder")}
              className={`${input} mt-2 placeholder:text-slate-600 focus:border-indigo-500`}
            />
            <datalist id="sale-channel-list">
              {channels.map((value) => <option key={value} value={value} />)}
            </datalist>
          </label>

          <TotalAmountField tone="indigo" value={total} hint={t("modal.sale.autofill")} onChange={changeTotal} />
        </div>

        <LineItems
          title={t("common.products")}
          items={items}
          products={products}
          kind="sale"
          onAdd={() => setItems((current) => [...current, emptyItem()])}
          onRemove={(index) => setItems((current) => distributeTotal(current.filter((_, itemIndex) => itemIndex !== index), total, products))}
          onChange={update}
          onProductChange={chooseProduct}
        />

        <FormFooter onClose={onClose} busy={busy} disabled={loadingExisting || Boolean(loadError)} label={t("modal.sale.save")} tone="indigo" />
      </form>
    </Modal>
  );
}
