"use client";

import { useEffect } from "react";

import { t } from "@/i18n/t";

/**
 * The dialog shell every modal in the app is built on.
 *
 * It lived inside the operation modals, so anything else that needed a dialog
 * either imported from that 500-line file or, as the product history did,
 * reimplemented the frame with its own `showModal` bookkeeping.
 */

/** Drives a native `<dialog>` from React state and reports user dismissals. */
export function useDialogOpen(
  open: boolean,
  dialogRef: React.RefObject<HTMLDialogElement | null>,
  onClose: () => void,
) {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [dialogRef, open]);

  return {
    ref: dialogRef,
    onClose: (event: React.SyntheticEvent<HTMLDialogElement>) => {
      if (event.currentTarget === event.target) onClose();
    },
  };
}

export default function Modal({
  dialogRef,
  maxWidth,
  title,
  subtitle,
  icon,
  children,
  onClose,
  dismissible = true,
  scrollable = false,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  maxWidth: string;
  title: string;
  /** Secondary line under the title; used by the product history. */
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  /**
   * A non-dismissible frame is used when the app cannot continue without the
   * form being completed (creating the very first project).
   */
  dismissible?: boolean;
  /** Caps the frame at the viewport and scrolls the body inside it. */
  scrollable?: boolean;
}) {
  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => { event.preventDefault(); if (dismissible) onClose(); }}
      onMouseDown={(event) => { if (dismissible && event.target === event.currentTarget) onClose(); }}
      className={`relative z-50 m-auto w-full ${maxWidth} bg-transparent p-0 backdrop:bg-black/80 backdrop:backdrop-blur-sm`}
    >
      <div className={`m-4 overflow-hidden rounded-3xl border border-white/10 bg-[#14151a] shadow-2xl ${scrollable ? "flex max-h-[90vh] flex-col" : ""}`}>
        <div className={`flex items-center justify-between border-b border-white/5 bg-white/5 p-6 ${scrollable ? "shrink-0" : ""}`}>
          <div>
            <h3 className="flex items-center gap-2 text-xl font-bold text-white">{icon}{title}</h3>
            {subtitle !== undefined && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 transition-colors hover:text-white"
              aria-label={t("common.close")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          )}
        </div>
        {children}
      </div>
    </dialog>
  );
}
