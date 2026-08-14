"use client";

import { useEffect, useRef, useState } from "react";

import Modal, { useDialogOpen } from "@/components/ui/Modal";
import { apiErrorMessage, apiJson } from "@/lib/client-api";
import { today } from "@/lib/format";
import { getProductNameKey } from "@/lib/mock-data";
import { useT } from "@/i18n/LocaleProvider";
import { ui } from "@/i18n/ui";

import type { StockRow } from "@/types/erp";

type Movement = { unidades: number; tipo: string; fecha: string; precio?: number | null; canal?: string | null };

/** Sales and purchases carry a translated label; anything else prints raw. */
function movementLabel(type: string): string {
  return ui.en[`movementType.${type}`] ?? type.replace("_", " ");
}

/** A failed read is shown as "no movements" rather than as a broken table. */
async function fetchMovements(projectId: number, productId: number): Promise<Movement[]> {
  try {
    const result = await apiJson<{ data: Movement[] }>(`/api/stock/movements?projectId=${projectId}&productId=${productId}`);
    return result.data ?? [];
  } catch {
    return [];
  }
}

// Darker than the shared field style: these sit on a lighter panel.
const adjustInput = "w-full rounded-lg border border-white/10 bg-[#14151a] px-3 py-2 text-sm text-white transition-all focus:border-blue-500 focus:outline-none";

const icon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="m19 9-5 5-4-4-3 3" />
  </svg>
);

/**
 * Every movement recorded for one product, plus the manual adjustment form.
 *
 * Adjustments are how stock is corrected after a count, a breakage or a return
 * that never went through a sale.
 */
export default function ProductHistoryModal({ product, onClose }: { product: StockRow | null; onClose: () => void }) {
  const { t, formatCurrency, formatDate } = useT();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  useDialogOpen(product !== null, dialogRef, onClose);
  const [loaded, setLoaded] = useState<{ product: number; movements: Movement[] } | null>(null);
  const [saving, setSaving] = useState(false);

  const projectId = product?.proyecto_id;
  const productId = product?.producto_id;

  useEffect(() => {
    if (projectId === undefined || productId === undefined) return;
    let active = true;
    void fetchMovements(projectId, productId).then((rows) => {
      if (active) setLoaded({ product: productId, movements: rows });
    });
    return () => { active = false; };
  }, [projectId, productId]);

  // Tagging the result with the product it belongs to is what makes opening
  // the modal on another product show a spinner rather than the previous
  // product's movements for a frame.
  const movements = loaded && loaded.product === productId ? loaded.movements : null;

  async function submitAdjustment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product) return;
    // React's event currentTarget is only guaranteed while the synchronous
    // handler is running. Capture the form before awaiting the API call;
    // otherwise React 19 exposes a null currentTarget after the await and the
    // successful adjustment is incorrectly reported as a save failure.
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    try {
      await apiJson("/api/stock/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: product.proyecto_id,
          productId: product.producto_id,
          units: Number(form.get("units")),
          date: String(form.get("date")),
        }),
      });
      formElement.reset();
      setLoaded({ product: product.producto_id, movements: await fetchMovements(product.proyecto_id, product.producto_id) });
    } catch (cause) {
      window.alert(`${t("common.saveErrorPrefix")} ${apiErrorMessage(t, cause, t("common.unknown"))}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      dialogRef={dialogRef}
      maxWidth="max-w-5xl"
      title={t("modal.history.title")}
      subtitle={product ? t(getProductNameKey(product.nombre_producto)) : ""}
      icon={icon}
      onClose={onClose}
      scrollable
    >
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-8 rounded-xl border border-white/5 bg-white/5 p-4">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t("modal.history.addManualAdjust")}
          </h3>

          <form className="grid grid-cols-1 items-end gap-4 md:grid-cols-4" onSubmit={submitAdjustment}>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">{t("txn.colDate")}</label>
              <input type="date" name="date" defaultValue={today()} required className={adjustInput} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">{t("modal.history.unitsPlusMinus")}</label>
              <input type="number" name="units" required placeholder={t("modal.history.unitsPlaceholderProduct")} step="1" className={adjustInput} />
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400 transition-all hover:bg-blue-500/20 disabled:opacity-50">
                {t("modal.history.registerAdjust")}
              </button>
            </div>
          </form>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-white/5 text-xs font-semibold uppercase text-slate-200">
              <tr>
                <th className="px-4 py-3">{t("modal.history.colDate")}</th>
                <th className="px-4 py-3">{t("modal.history.colType")}</th>
                <th className="px-4 py-3 text-right">{t("modal.history.colUnits")}</th>
                <th className="px-4 py-3 text-right">{t("modal.history.colPrice")}</th>
                <th className="px-4 py-3">{t("modal.history.colChannel")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {movements === null ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center italic">{t("modal.history.loading")}</td></tr>
              ) : movements.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">{t("modal.history.noMovementsDot")}</td></tr>
              ) : movements.map((movement, index) => (
                <tr key={`${movement.fecha}-${index}`} className="transition-colors hover:bg-white/5">
                  <td className="px-4 py-3 text-slate-300">{formatDate(movement.fecha, { year: "numeric", month: "short", day: "numeric" })}</td>
                  <td className={`px-4 py-3 font-medium capitalize ${movement.tipo === "venta" ? "text-blue-400" : movement.tipo === "compra" ? "text-emerald-400" : "text-slate-200"}`}>
                    {movementLabel(movement.tipo)}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${movement.unidades > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {movement.unidades > 0 ? "+" : ""}{movement.unidades}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">
                    {movement.precio == null ? "-" : formatCurrency(movement.precio)}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{movement.canal || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
