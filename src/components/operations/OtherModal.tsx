"use client";

import { useEffect, useRef, useState } from "react";

import Modal, { useDialogOpen } from "@/components/ui/Modal";
import { fieldLabel, input } from "@/components/ui/form";
import { apiJson } from "@/lib/client-api";
import { dateOnly, today } from "@/lib/format";
import { useT } from "@/i18n/LocaleProvider";

import { FormFooter, LoadingNotice } from "./FormParts";
import { reportSaveError, useExistingRecord, type OperationModalProps, type OtherRecord } from "./shared";

const icon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

/** Income and expenses that are not tied to a product: fees, rent, refunds. */
export default function OtherModal({ transactionId, projectId, demo, onClose, onSaved }: OperationModalProps) {
  const { t } = useT();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  useDialogOpen(true, dialogRef, onClose);
  const editing = transactionId !== null;

  const [type, setType] = useState<"ingreso" | "gasto">("ingreso");
  const [date, setDate] = useState(today());
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [vat, setVat] = useState("");
  const [description, setDescription] = useState("");
  const [concepts, setConcepts] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void apiJson<{ concepts: string[] }>(`/api/transactions/concepts?projectId=${projectId ?? ""}`)
      .then((data) => setConcepts(data.concepts ?? []))
      .catch(() => setConcepts([]));
  }, [projectId]);

  const { loading: loadingExisting, error: loadError } = useExistingRecord<OtherRecord>("/api/transactions/get-other", {
    transactionId,
    projectId,
    demo,
    errorKey: "modal.other.loadError",
    onLoad: (transaction) => {
      setType(transaction.tipo === "gasto" ? "gasto" : "ingreso");
      setDate(dateOnly(transaction.fecha));
      setConcept(transaction.concepto);
      setAmount(String(transaction.importe));
      setVat(String(transaction.porcentaje_iva ?? 0));
      setDescription(transaction.descripcion ?? "");
    },
  });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || demo || loadingExisting || loadError) return;
    setBusy(true);
    try {
      await apiJson("/api/transactions/save", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editing ? { id: transactionId } : {}),
          projectId,
          tipo: type,
          fecha: date,
          concepto: concept,
          descripcion: description,
          importe: Number(amount),
          porcentaje_iva: Number(vat || 0),
        }),
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
      maxWidth="max-w-2xl"
      title={editing ? t("modal.other.editTitle") : t("modal.other.title")}
      icon={icon}
      onClose={onClose}
    >
      <form className="space-y-6 p-6" onSubmit={submit} aria-busy={loadingExisting}>
        {loadingExisting && <LoadingNotice tone="pink" />}

        <div>
          <label className={`mb-2 ${fieldLabel}`}>{t("modal.other.transType")}</label>
          <div className="grid grid-cols-2 gap-4">
            <TypeChoice label={t("modal.other.income")} value="ingreso" checked={type === "ingreso"} onSelect={setType} />
            <TypeChoice label={t("modal.other.expense")} value="gasto" checked={type === "gasto"} onSelect={setType} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <label className={fieldLabel}>
            {t("txn.colDate")}
            <input type="date" name="fecha" required value={date} onChange={(event) => setDate(event.target.value)} className={`${input} mt-2 focus:border-purple-500`} />
          </label>

          <label className={fieldLabel}>
            {t("modal.other.concept")}
            <input
              list="conceptos-list"
              required
              value={concept}
              onChange={(event) => setConcept(event.target.value)}
              placeholder={t("modal.other.conceptPlaceholder")}
              className={`${input} mt-2 placeholder:text-slate-600 focus:border-purple-500`}
            />
            <datalist id="conceptos-list">
              {concepts.map((item) => <option key={item} value={item} />)}
            </datalist>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <label className={fieldLabel}>
            {t("modal.other.amount")}
            <input type="number" name="importe" required step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} className={`${input} mt-2 font-mono font-bold focus:border-purple-500`} />
          </label>

          <label className={fieldLabel}>
            {t("modal.other.vatPct")} <span className="text-[10px] lowercase text-slate-600">{t("modal.other.optional")}</span>
            <input type="number" name="porcentaje_iva" step="0.1" placeholder="0" value={vat} onChange={(event) => setVat(event.target.value)} className={`${input} mt-2 focus:border-purple-500`} />
          </label>
        </div>

        <label className={fieldLabel}>
          {t("modal.other.description")}
          <textarea name="descripcion" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("modal.other.descPlaceholder")} className={`${input} mt-2 resize-none focus:border-purple-500`} />
        </label>

        <FormFooter onClose={onClose} busy={busy} disabled={loadingExisting || Boolean(loadError)} label={t("common.save")} tone="purple" />
      </form>
    </Modal>
  );
}

/** Income / expense selector: a radio styled as a card. */
function TypeChoice({
  label,
  value,
  checked,
  onSelect,
}: {
  label: string;
  value: "ingreso" | "gasto";
  checked: boolean;
  onSelect: (value: "ingreso" | "gasto") => void;
}) {
  const active = value === "ingreso"
    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
    : "border-red-500/50 bg-red-500/10 text-red-400";

  return (
    <label className={`relative flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-3 transition-all ${checked ? active : "border-white/10 hover:bg-white/5"}`}>
      <input type="radio" name="tipo" value={value} checked={checked} onChange={() => onSelect(value)} className="hidden" />
      <span className="font-medium">{label}</span>
    </label>
  );
}
