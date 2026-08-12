"use client";

import { t } from "@/i18n/t";
import { compactInput, fieldLabel, input } from "@/components/ui/form";

import type { Item, Product } from "./shared";

/**
 * The pieces the three operation forms are assembled from. Each of them used
 * to be inlined per modal with only its accent colour changing, so a fix to
 * one never reached the others.
 */

/** Accent colour of a form; the only thing that differs between operations. */
export type Tone = "indigo" | "emerald" | "pink" | "purple";

const noticeTone: Record<Tone, string> = {
  indigo: "border-indigo-500/20 bg-indigo-500/10 text-indigo-200",
  emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
  pink: "border-pink-500/20 bg-pink-500/10 text-pink-200",
  purple: "border-purple-500/20 bg-purple-500/10 text-purple-200",
};

const spinnerTone: Record<Tone, string> = {
  indigo: "border-indigo-300/30 border-t-indigo-300",
  emerald: "border-emerald-300/30 border-t-emerald-300",
  pink: "border-pink-300/30 border-t-pink-300",
  purple: "border-purple-300/30 border-t-purple-300",
};

const submitTone: Record<Tone, string> = {
  indigo: "bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20",
  emerald: "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20",
  pink: "bg-pink-500 hover:bg-pink-600 shadow-pink-500/20",
  purple: "bg-purple-500 hover:bg-purple-600 shadow-purple-500/20",
};

/** Shown while an existing operation is being fetched into the form. */
export function LoadingNotice({ tone }: { tone: Tone }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${noticeTone[tone]}`}>
      <span className={`h-3.5 w-3.5 animate-spin rounded-full border-2 ${spinnerTone[tone]}`} />
      {t("common.loadingData")}
    </div>
  );
}

/**
 * The optional order total. Typing one spreads the amount over the lines, so
 * a marketplace payout can be entered without pricing each product by hand.
 */
export function TotalAmountField({
  tone,
  value,
  hint,
  onChange,
}: {
  tone: "indigo" | "emerald";
  value: string;
  hint: string;
  onChange: (value: string) => void;
}) {
  const accent = tone === "indigo"
    ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-100 placeholder-indigo-300/30 focus:border-indigo-500"
    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100 placeholder-emerald-300/30 focus:border-emerald-500";

  return (
    <label className={`${fieldLabel} ${tone === "indigo" ? "text-indigo-300" : "text-emerald-300"}`}>
      {t("common.totalAmountOptional")}
      <span className="relative mt-2 block">
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${input} pr-8 font-mono font-bold ${accent}`}
          placeholder="0.00"
        />
        <span className={`absolute right-3 top-3 text-sm ${tone === "indigo" ? "text-indigo-400" : "text-emerald-400"}`}>€</span>
      </span>
      <span className="mt-1 block text-[10px] normal-case text-slate-500">{hint}</span>
    </label>
  );
}

/** Cancel / submit pair closing every operation form. */
export function FormFooter({
  onClose,
  busy,
  disabled = false,
  label,
  tone,
}: {
  onClose: () => void;
  busy: boolean;
  disabled?: boolean;
  label: string;
  tone: Tone;
}) {
  return (
    <div className="flex justify-end gap-3 border-t border-white/5 pt-6">
      <button type="button" onClick={onClose} className="rounded-xl px-6 py-2 text-slate-400 transition-all hover:bg-white/5 hover:text-white">
        {t("common.cancel")}
      </button>
      <button
        type="submit"
        disabled={busy || disabled}
        className={`rounded-xl px-6 py-2 font-bold text-white shadow-lg transition-all disabled:opacity-50 ${submitTone[tone]}`}
      >
        {busy ? t("common.loading") : label}
      </button>
    </div>
  );
}

/** The editable product lines of a sale or a purchase. */
export function LineItems({
  title,
  items,
  products,
  kind,
  onAdd,
  onRemove,
  onChange,
  onProductChange,
}: {
  title: string;
  items: Item[];
  products: Product[];
  kind: "sale" | "purchase";
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, key: keyof Item, value: string) => void;
  onProductChange: (index: number, productId: string) => void;
}) {
  return (
    <div className="border-t border-white/5 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-sm font-bold uppercase tracking-wider text-white">{title}</h4>
        <button type="button" onClick={onAdd} className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          {t("common.addProduct")}
        </button>
      </div>

      <div className="max-h-[40vh] space-y-4 overflow-y-auto pr-2">
        {items.map((item, index) => (
          <div key={index} className="mb-4 grid grid-cols-1 items-end gap-2 border-b border-white/5 pb-4 md:mb-2 md:grid-cols-12 md:border-0 md:pb-0">
            <div className="grid grid-cols-1 gap-2 md:col-span-11 md:grid-cols-11">
              <label className="block md:col-span-5">
                <span className="mb-1 block text-xs text-slate-500">{t("item.product")}</span>
                <select
                  value={item.productId}
                  onChange={(event) => onProductChange(index, event.target.value)}
                  className={`${compactInput} focus:border-primary-500`}
                >
                  <ProductOptions products={products} kind={kind} selected={item.productId} />
                </select>
              </label>

              <div className="grid grid-cols-3 gap-2 md:contents">
                <label className="md:col-span-2">
                  <span className="mb-1 block text-xs text-slate-500">{t("item.units")}</span>
                  <input type="number" min="0.01" step="0.01" value={item.units} onChange={(event) => onChange(index, "units", event.target.value)} placeholder="1" className={`${compactInput} focus:border-primary-500`} />
                </label>
                <label className="md:col-span-2">
                  <span className="mb-1 block text-xs text-slate-500">{t("item.price")}</span>
                  <input type="number" min="0" step="0.01" value={item.price} onChange={(event) => onChange(index, "price", event.target.value)} placeholder="0.00" className={`${compactInput} focus:border-primary-500`} />
                </label>
                <label className="md:col-span-2">
                  <span className="mb-1 block text-xs text-slate-500">{t("item.vat")}</span>
                  <input type="number" value={item.tax} onChange={(event) => onChange(index, "tax", event.target.value)} className={`${compactInput} focus:border-primary-500`} />
                </label>
              </div>
            </div>

            <div className="flex justify-end pb-2 md:col-span-1">
              <button type="button" onClick={() => onRemove(index)} className="text-red-400 hover:text-red-300" aria-label={t("common.delete")}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * A sale can only move stock that exists, so sold-out products are hidden —
 * except the one a line already holds, which must stay selectable while an
 * older operation is being edited.
 */
function ProductOptions({ products, kind, selected }: { products: Product[]; kind: "sale" | "purchase"; selected: string }) {
  const selectable = products.filter((product) => kind === "purchase" || product.stock > 0 || String(product.id) === selected);
  return (
    <>
      <option value="">{selectable.length ? t("common.select") : t("modal.sale.noProducts")}</option>
      {selectable.map((product) => (
        <option key={product.id} value={product.id}>{product.name}</option>
      ))}
    </>
  );
}
