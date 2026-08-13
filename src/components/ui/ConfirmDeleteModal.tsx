"use client";

import { useRef, useState } from "react";

import { t } from "@/i18n/t";

import Modal, { useDialogOpen } from "./Modal";
import { Spinner } from "./Spinner";
import { dangerSolidButton, ghostButton } from "./button";
import { input } from "./form";

const warningIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

/**
 * Confirmation for an irreversible deletion.
 *
 * The user has to retype the exact name of what is being destroyed. That is
 * deliberately more friction than an "are you sure?" — these actions erase
 * accounting data with no undo, and the typing step makes it impossible to
 * trigger one by muscle memory from the wrong row.
 */
export default function ConfirmDeleteModal({
  title,
  warningHtml,
  confirmLabel,
  confirmValue,
  actionLabel,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  /** Pre-escaped copy with a single <strong> highlight; see settings strings. */
  warningHtml: string;
  confirmLabel: string;
  confirmValue: string;
  actionLabel: string;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  useDialogOpen(true, dialogRef, onClose);
  const [typed, setTyped] = useState("");
  const matches = typed.trim() === confirmValue;

  return (
    <Modal
      dialogRef={dialogRef}
      maxWidth="max-w-md"
      title={title}
      icon={warningIcon}
      onClose={onClose}
      dismissible={!busy}
    >
      <form
        className="space-y-6 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (matches && !busy) onConfirm();
        }}
      >
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p
            className="text-sm leading-relaxed text-red-100"
            // The only markup is the <strong> around the resource name, which
            // comes from the dictionary, not from user input.
            dangerouslySetInnerHTML={{ __html: warningHtml }}
          />
          <p className="mt-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            {t("common.irreversible")}
          </p>
        </div>

        <div>
          {/* The value is compared case-sensitively, so it is rendered inline
              in its own casing: the label around it is uppercased by CSS and
              would otherwise misrepresent what has to be typed. */}
          <label
            htmlFor="confirm-deletion"
            className="block text-xs font-medium uppercase tracking-wider text-slate-400"
          >
            {confirmLabel}{" "}
            <code className="select-all rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] normal-case tracking-normal text-slate-200">
              {confirmValue}
            </code>
          </label>
          <input
            id="confirm-deletion"
            type="text"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            disabled={busy}
            aria-describedby="confirm-deletion-state"
            className={`${input} mt-2 font-mono placeholder:text-slate-600 focus:border-red-500`}
          />
          <p
            id="confirm-deletion-state"
            role="status"
            className={`mt-2 h-4 text-xs ${matches ? "text-emerald-400" : "text-slate-600"}`}
          >
            {typed.length > 0 && !matches ? t("settings.confirmMismatch") : ""}
            {matches ? t("settings.confirmMatch") : ""}
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={ghostButton}
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={!matches || busy}
            className={`${dangerSolidButton} flex items-center gap-2`}
          >
            {busy ? (
              <Spinner />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            )}
            {busy ? t("settings.deleting") : actionLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
