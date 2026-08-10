"use client";

import { useRef, useState } from "react";

import { apiErrorMessage, apiJson } from "@/lib/client-api";
import { ui } from "@/i18n/ui";

import { ModalFrame, input, useDialogOpen } from "./OperationModals";

type Project = { id: number; nombre: string; activo?: boolean };

const t = (key: string) => ui.en[key] ?? key;

/**
 * Creates a project. When `mandatory` is set the account has no project yet,
 * so the dialog cannot be dismissed: the rest of the app is unusable without
 * one.
 */
export default function ProjectModal({
  mandatory,
  demo,
  onClose,
  onCreated,
}: {
  mandatory: boolean;
  demo: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  useDialogOpen(true, dialogRef, onClose);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (demo || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const body = await apiJson<{ data: Project }>("/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      onCreated(body.data);
    } catch (cause) {
      setError(apiErrorMessage(cause, t("modal.project.createError")));
    } finally {
      setBusy(false);
    }
  }

  const icon = (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      <path d="M12 11v6" />
      <path d="M9 14h6" />
    </svg>
  );

  return (
    <ModalFrame
      dialogRef={dialogRef}
      maxWidth="max-w-md"
      title={mandatory ? t("modal.project.firstTitle") : t("modal.project.title")}
      icon={icon}
      onClose={onClose}
      dismissible={!mandatory}
    >
      <form className="space-y-6 p-6" onSubmit={submit}>
        {mandatory && <p className="text-sm text-slate-400">{t("modal.project.intro")}</p>}

        <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">
          {t("modal.project.name")}
          <input
            type="text"
            name="nombre"
            required
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("modal.project.placeholder")}
            className={`${input} mt-2 placeholder:text-slate-600 focus:border-primary-500`}
          />
        </label>

        {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
          {!mandatory && (
            <button type="button" onClick={onClose} className="rounded-xl px-6 py-2 text-slate-400 transition-all hover:bg-white/5 hover:text-white">
              {t("common.cancel")}
            </button>
          )}
          <button type="submit" disabled={busy || !name.trim()} className="flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary-500/20 transition-all hover:bg-primary-600 disabled:opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            {busy ? t("common.loading") : t("modal.project.save")}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}
