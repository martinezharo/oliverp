"use client";

import { useRef, useState } from "react";

import Modal, { useDialogOpen } from "@/components/ui/Modal";
import { fieldLabel, input } from "@/components/ui/form";
import { apiJson } from "@/lib/client-api";
import { useT } from "@/i18n/LocaleProvider";

import { reportSaveError, type OperationModalProps } from "./shared";

const icon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m7.5 4.27 9 5.15" />
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73V8Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22v-10" />
  </svg>
);

/** Registers a new product in the catalogue; prices come from operations. */
export default function ProductModal({ projectId, demo, onClose, onSaved }: Omit<OperationModalProps, "transactionId">) {
  const { t } = useT();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  useDialogOpen(true, dialogRef, onClose);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || demo) return;
    setBusy(true);
    try {
      await apiJson("/api/products/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, name }),
      });
      onSaved();
    } catch (cause) {
      reportSaveError(t, cause, "modal.product.createError");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal dialogRef={dialogRef} maxWidth="max-w-md" title={t("modal.product.title")} icon={icon} onClose={onClose}>
      <form className="space-y-6 p-6" onSubmit={submit}>
        <label className={fieldLabel}>
          {t("modal.product.name")}
          <input
            type="text"
            name="nombre"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("modal.product.placeholder")}
            className={`${input} mt-2 placeholder:text-slate-600 focus:border-primary-500`}
          />
        </label>

        <div className="flex justify-end border-t border-white/5 pt-4">
          <button type="submit" disabled={busy} className="flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary-500/20 transition-all hover:bg-primary-600 disabled:opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            {t("modal.product.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
