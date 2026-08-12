"use client";

import { useEffect, useRef, useState } from "react";

import { apiErrorMessage, apiJson } from "@/lib/client-api";
import { ui } from "@/i18n/ui";

type Kind = "sale" | "purchase" | "other" | "product" | null;
type Product = { id: number; name: string; price: number; stock: number };
export type Item = { productId: string; units: string; price: string; tax: string };
type SaleRecord = {
  fecha: string;
  canal: string;
  venta_detalle?: Array<{
    producto_id: number;
    unidades: number;
    precio_unitario_venta: number;
    porcentaje_iva?: number;
  }>;
};
type PurchaseRecord = {
  fecha: string;
  estado: string;
  compra_detalle?: Array<{
    producto_id: number;
    unidades: number;
    precio_unitario_compra: number;
    porcentaje_iva?: number;
  }>;
};
type OtherRecord = {
  tipo: "ingreso" | "gasto";
  fecha: string;
  concepto: string;
  importe: number;
  porcentaje_iva?: number;
  descripcion?: string | null;
};

const t = (key: string, values?: Record<string, string | number>) => {
  let value = ui.en[key] ?? key;
  for (const [name, replacement] of Object.entries(values ?? {})) {
    value = value.replace(`{${name}}`, String(replacement));
  }
  return value;
};
const today = () => new Date().toISOString().slice(0, 10);
const dateOnly = (value: string) => value.slice(0, 10);
export const input = "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white transition-all focus:outline-none";
const itemInput = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500";

export default function OperationModals({
  kind,
  transactionId = null,
  projectId,
  demo,
  onClose,
  onSaved,
}: {
  kind: Kind;
  transactionId?: number | null;
  projectId: number | null;
  demo: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  if (kind === "sale") {
    return <SaleModal transactionId={transactionId ?? null} projectId={projectId} demo={demo} onClose={onClose} onSaved={onSaved} />;
  }
  if (kind === "purchase") {
    return <PurchaseModal transactionId={transactionId ?? null} projectId={projectId} demo={demo} onClose={onClose} onSaved={onSaved} />;
  }
  if (kind === "other") {
    return <OtherModal transactionId={transactionId ?? null} projectId={projectId} demo={demo} onClose={onClose} onSaved={onSaved} />;
  }
  if (kind === "product") return <ProductModal projectId={projectId} demo={demo} onClose={onClose} onSaved={onSaved} />;
  return null;
}

export function useDialogOpen(open: boolean, dialogRef: React.RefObject<HTMLDialogElement | null>, onClose: () => void) {
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

export function ModalFrame({
  dialogRef,
  maxWidth,
  title,
  icon,
  children,
  onClose,
  dismissible = true,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  maxWidth: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  dismissible?: boolean;
}) {
  // A non-dismissible frame is used when the app cannot continue without the
  // form being completed (creating the very first project).
  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => { event.preventDefault(); if (dismissible) onClose(); }}
      onMouseDown={(event) => { if (dismissible && event.target === event.currentTarget) onClose(); }}
      className={`relative z-50 m-auto w-full ${maxWidth} bg-transparent p-0 backdrop:bg-black/80 backdrop:backdrop-blur-sm`}
    >
      <div className="m-4 overflow-hidden rounded-3xl border border-white/10 bg-[#14151a] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 bg-white/5 p-6">
          <h3 className="flex items-center gap-2 text-xl font-bold text-white">{icon}{title}</h3>
          {dismissible && (
            <button type="button" onClick={onClose} className="text-slate-400 transition-colors hover:text-white" aria-label={t("common.close")}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          )}
        </div>
        {children}
      </div>
    </dialog>
  );
}

/**
 * Loads the record an edit modal starts from.
 *
 * The read endpoints are scoped by project, so the request has to carry
 * `projectId` next to the id — a bare id is rejected with a 400 and the form
 * would open empty over an existing operation. While the active project is
 * still unknown the hook stays in its loading state instead of firing an
 * incomplete request; the shell remounts the modal once the project resolves.
 */
function useExistingRecord<T>(
  endpoint: string,
  {
    transactionId,
    projectId,
    demo,
    errorKey,
    onLoad,
  }: {
    transactionId: number | null;
    projectId: number | null;
    demo: boolean;
    errorKey: string;
    onLoad: (record: T) => void;
  },
) {
  const [loading, setLoading] = useState(transactionId !== null && !demo);
  const [error, setError] = useState<string | null>(null);
  // Held in a ref so callers can pass an inline closure over their setters
  // without the request restarting on every render.
  const apply = useRef(onLoad);
  useEffect(() => { apply.current = onLoad; });

  useEffect(() => {
    if (!transactionId || demo || !projectId) return;
    let active = true;
    void apiJson<T>(`${endpoint}?id=${transactionId}&projectId=${projectId}`)
      .then((record) => { if (active) apply.current(record); })
      .catch((cause) => {
        if (!active) return;
        const message = apiErrorMessage(cause, t(errorKey));
        setError(message);
        window.alert(message);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [demo, endpoint, errorKey, projectId, transactionId]);

  return { loading, error };
}

/**
 * Turns the form rows into the payload lines. Rows without a product chosen
 * are dropped here: `Number("")` serializes as a value the backend rejects
 * with an opaque validation error.
 */
export function orderLines(items: Item[]): Array<{ productId: number; units: number; price: number; tax: number }> {
  return items
    .map((item) => ({
      productId: Number(item.productId),
      units: Number(item.units || 1),
      price: Number(item.price || 0),
      tax: Number(item.tax || 21),
    }))
    .filter((line) => Number.isInteger(line.productId) && line.productId > 0);
}

export function saleItemsFromRecord(details: SaleRecord["venta_detalle"] = []): Item[] {
  return details.map((line) => ({
    productId: String(line.producto_id),
    units: String(line.unidades),
    price: String(line.precio_unitario_venta),
    tax: String(line.porcentaje_iva ?? 21),
  }));
}

export function purchaseItemsFromRecord(details: PurchaseRecord["compra_detalle"] = []): Item[] {
  return details.map((line) => ({
    productId: String(line.producto_id),
    units: String(line.unidades),
    price: String(line.precio_unitario_compra),
    tax: String(line.porcentaje_iva ?? 21),
  }));
}

function itemTotal(items: Item[]): string {
  return items.reduce((sum, item) => sum + Number(item.units || 0) * Number(item.price || 0), 0).toFixed(2);
}

/** Splits a known total over the selected products using their reference prices. */
function distributeTotal(items: Item[], total: string, products: Product[]): Item[] {
  const amount = Number(total || 0);
  if (!(amount > 0)) return items;
  const references = items.map((item) => {
    const reference = products.find((product) => String(product.id) === item.productId)?.price ?? 0;
    const units = Number(item.units || 0);
    return units > 0 && reference > 0 ? { reference, weight: units * reference } : null;
  });
  const totalWeight = references.reduce((sum, entry) => sum + (entry?.weight ?? 0), 0);
  if (!totalWeight) return items;
  const ratio = amount / totalWeight;
  return items.map((item, index) => {
    const entry = references[index];
    return entry ? { ...item, price: (entry.reference * ratio).toFixed(2) } : item;
  });
}

function SaleModal({ transactionId, projectId, demo, onClose, onSaved }: { transactionId: number | null; projectId: number | null; demo: boolean; onClose: () => void; onSaved: () => void }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  useDialogOpen(true, dialogRef, onClose);
  const editing = transactionId !== null;
  const [products, setProducts] = useState<Product[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [date, setDate] = useState(today());
  const [channel, setChannel] = useState("");
  const [total, setTotal] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void apiJson<{ products: Product[]; channels: string[] }>(`/api/sales/init-data?projectId=${projectId ?? ""}`)
      .then((data) => { setProducts(data.products ?? []); setChannels(data.channels ?? []); })
      .catch(() => { setProducts([]); setChannels([]); });
  }, [projectId]);

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
    setItems((current) => distributeTotal(current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item), key === "price" ? "" : total, products));
  }
  function chooseProduct(index: number, value: string) {
    const product = products.find((item) => String(item.id) === value);
    setItems((current) => distributeTotal(current.map((item, itemIndex) => itemIndex === index ? { ...item, productId: value, price: product ? String(product.price || "") : item.price } : item), total, products));
  }
  function changeTotal(value: string) { setTotal(value); setItems((current) => distributeTotal(current, value, products)); }

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
      window.alert(`${t("common.saveErrorPrefix")} ${apiErrorMessage(cause, t("common.unknown"))}`);
    } finally { setBusy(false); }
  }

  const icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></svg>;
  return (
    <ModalFrame dialogRef={dialogRef} maxWidth="max-w-4xl" title={editing ? t("modal.sale.editTitle", { id: transactionId ?? "" }) : t("modal.sale.title")} icon={icon} onClose={onClose}>
      <form className="space-y-6 p-6" onSubmit={submit} aria-busy={loadingExisting}>
        {loadingExisting && <div className="flex items-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-300/30 border-t-indigo-300" />{t("common.loadingData")}</div>}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">{t("txn.colDate")}<input type="date" name="fecha" required value={date} onChange={(event) => setDate(event.target.value)} className={`${input} mt-2 focus:border-indigo-500`} /></label>
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">{t("modal.sale.channel")}<input id="sale-channel" list="sale-channel-list" required value={channel} onChange={(event) => setChannel(event.target.value)} placeholder={t("modal.sale.channelPlaceholder")} className={`${input} mt-2 placeholder:text-slate-600 focus:border-indigo-500`} /><datalist id="sale-channel-list">{channels.map((value) => <option key={value} value={value} />)}</datalist></label>
          <label className="block text-xs font-medium uppercase tracking-wider text-indigo-300">{t("common.totalAmountOptional")}<span className="relative mt-2 block"><input type="number" id="total-amount" step="0.01" value={total} onChange={(event) => changeTotal(event.target.value)} className={`${input} border-indigo-500/30 bg-indigo-500/10 pr-8 font-mono font-bold text-indigo-100 placeholder-indigo-300/30 focus:border-indigo-500`} placeholder="0.00" /><span className="absolute right-3 top-3 text-sm text-indigo-400">€</span></span><span className="mt-1 block text-[10px] normal-case text-slate-500">{t("modal.sale.autofill")}</span></label>
        </div>
        <LineItems title={t("common.products")} items={items} products={products} kind="sale" onAdd={() => setItems((current) => [...current, { productId: "", units: "", price: "", tax: "21" }])} onRemove={(index) => setItems((current) => distributeTotal(current.filter((_, itemIndex) => itemIndex !== index), total, products))} onChange={update} onProductChange={chooseProduct} />
        <FormFooter onClose={onClose} busy={busy} disabled={loadingExisting || Boolean(loadError)} label={t("modal.sale.save")} tone="indigo" />
      </form>
    </ModalFrame>
  );
}

function PurchaseModal({ transactionId, projectId, demo, onClose, onSaved }: { transactionId: number | null; projectId: number | null; demo: boolean; onClose: () => void; onSaved: () => void }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  useDialogOpen(true, dialogRef, onClose);
  const editing = transactionId !== null;
  const [products, setProducts] = useState<Product[]>([]);
  const [date, setDate] = useState(today());
  const [status, setStatus] = useState("pendiente");
  const [total, setTotal] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void apiJson<{ products: Product[] }>(`/api/sales/init-data?projectId=${projectId ?? ""}`)
      .then((data) => setProducts(data.products ?? []))
      .catch(() => setProducts([]));
  }, [projectId]);

  const { loading: loadingExisting, error: loadError } = useExistingRecord<PurchaseRecord>("/api/purchases/get", {
    transactionId,
    projectId,
    demo,
    errorKey: "modal.purchase.loadError",
    onLoad: (purchase) => {
      const nextItems = purchaseItemsFromRecord(purchase.compra_detalle);
      setDate(dateOnly(purchase.fecha));
      setStatus(purchase.estado || "pendiente");
      setItems(nextItems);
      setTotal(itemTotal(nextItems));
    },
  });

  function update(index: number, key: keyof Item, value: string) { setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item)); }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || demo || loadingExisting || loadError) return;
    const lines = orderLines(items);
    if (!lines.length) { window.alert(t("modal.sale.noLines")); return; }
    setBusy(true);
    try {
      const payload = {
        ...(editing ? { id: transactionId } : {}),
        projectId,
        date,
        estado: status,
        items: lines.map(({ price, ...line }) => ({ ...line, unitPrice: price })),
      };
      await apiJson(editing ? "/api/purchases/update" : "/api/purchases/create", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      onSaved();
    } catch (cause) {
      window.alert(`${t("common.saveErrorPrefix")} ${apiErrorMessage(cause, t("common.unknown"))}`);
    } finally { setBusy(false); }
  }

  const icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 16-4 4-4-4" /><path d="M17 20V4" /><path d="m3 8 4-4 4 4" /><path d="M7 4v16" /></svg>;
  return (
    <ModalFrame dialogRef={dialogRef} maxWidth="max-w-4xl" title={editing ? t("modal.purchase.editTitle", { id: transactionId ?? "" }) : t("modal.purchase.title")} icon={icon} onClose={onClose}>
      <form className="space-y-6 p-6" onSubmit={submit} aria-busy={loadingExisting}>
        {loadingExisting && <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-300/30 border-t-emerald-300" />{t("common.loadingData")}</div>}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">{t("txn.colDate")}<input type="date" name="fecha" required value={date} onChange={(event) => setDate(event.target.value)} className={`${input} mt-2 focus:border-emerald-500`} /></label>
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">{t("modal.purchase.status")}<select name="estado" value={status} onChange={(event) => setStatus(event.target.value)} className={`${input} mt-2 focus:border-emerald-500`}><option value="pendiente">{t("modal.purchase.statusPending")}</option><option value="recibida">{t("modal.purchase.statusReceived")}</option><option value="cancelada">{t("modal.purchase.statusCancelled")}</option></select></label>
          <label className="block text-xs font-medium uppercase tracking-wider text-emerald-300">{t("common.totalAmountOptional")}<span className="relative mt-2 block"><input type="number" id="purchase-transaction-total" step="0.01" value={total} onChange={(event) => setTotal(event.target.value)} className={`${input} border-emerald-500/30 bg-emerald-500/10 pr-8 font-mono font-bold text-emerald-100 placeholder-emerald-300/30 focus:border-emerald-500`} placeholder="0.00" /><span className="absolute right-3 top-3 text-sm text-emerald-400">€</span></span><span className="mt-1 block text-[10px] normal-case text-slate-500">{t("modal.purchase.distribute")}</span></label>
        </div>
        <LineItems title={t("common.products")} items={items} products={products} kind="purchase" onAdd={() => setItems((current) => [...current, { productId: "", units: "", price: "", tax: "21" }])} onRemove={(index) => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} onChange={update} onProductChange={(index, productId) => update(index, "productId", productId)} />
        <div className="flex items-center justify-between border-t border-white/5 pt-4"><div className="text-sm text-slate-400">{t("modal.purchase.estimatedTotal")}</div><div className="text-xl font-bold text-emerald-400">{(Number(total || 0) > 0 ? Number(total) : Number(itemTotal(items))).toFixed(2)} €</div></div>
        <FormFooter onClose={onClose} busy={busy} disabled={loadingExisting || Boolean(loadError)} label={t("modal.purchase.save")} tone="emerald" />
      </form>
    </ModalFrame>
  );
}

function OtherModal({ transactionId, projectId, demo, onClose, onSaved }: { transactionId: number | null; projectId: number | null; demo: boolean; onClose: () => void; onSaved: () => void }) {
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
        body: JSON.stringify({ ...(editing ? { id: transactionId } : {}), projectId, tipo: type, fecha: date, concepto: concept, descripcion: description, importe: Number(amount), porcentaje_iva: Number(vat || 0) }),
      });
      onSaved();
    } catch (cause) {
      window.alert(`${t("common.saveErrorPrefix")} ${apiErrorMessage(cause, t("common.unknown"))}`);
    } finally { setBusy(false); }
  }

  const icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
  return (
    <ModalFrame dialogRef={dialogRef} maxWidth="max-w-2xl" title={editing ? t("modal.other.editTitle") : t("modal.other.title")} icon={icon} onClose={onClose}>
      <form className="space-y-6 p-6" onSubmit={submit} aria-busy={loadingExisting}>
        {loadingExisting && <div className="flex items-center gap-2 rounded-lg border border-pink-500/20 bg-pink-500/10 px-3 py-2 text-xs text-pink-200"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-pink-300/30 border-t-pink-300" />{t("common.loadingData")}</div>}
        <div><label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400">{t("modal.other.transType")}</label><div className="grid grid-cols-2 gap-4"><label className={`relative flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-3 transition-all ${type === "ingreso" ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-white/10 hover:bg-white/5"}`}><input type="radio" name="tipo" value="ingreso" checked={type === "ingreso"} onChange={() => setType("ingreso")} className="hidden" /><span className="font-medium">{t("modal.other.income")}</span></label><label className={`relative flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-3 transition-all ${type === "gasto" ? "border-red-500/50 bg-red-500/10 text-red-400" : "border-white/10 hover:bg-white/5"}`}><input type="radio" name="tipo" value="gasto" checked={type === "gasto"} onChange={() => setType("gasto")} className="hidden" /><span className="font-medium">{t("modal.other.expense")}</span></label></div></div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2"><label className="block text-xs font-medium uppercase tracking-wider text-slate-400">{t("txn.colDate")}<input type="date" name="fecha" required value={date} onChange={(event) => setDate(event.target.value)} className={`${input} mt-2 focus:border-purple-500`} /></label><label className="block text-xs font-medium uppercase tracking-wider text-slate-400">{t("modal.other.concept")}<input list="conceptos-list" required value={concept} onChange={(event) => setConcept(event.target.value)} placeholder={t("modal.other.conceptPlaceholder")} className={`${input} mt-2 placeholder:text-slate-600 focus:border-purple-500`} /><datalist id="conceptos-list">{concepts.map((item) => <option key={item} value={item} />)}</datalist></label></div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2"><label className="block text-xs font-medium uppercase tracking-wider text-slate-400">{t("modal.other.amount")}<input type="number" name="importe" required step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} className={`${input} mt-2 font-mono font-bold focus:border-purple-500`} /></label><label className="block text-xs font-medium uppercase tracking-wider text-slate-400">{t("modal.other.vatPct")} <span className="text-[10px] lowercase text-slate-600">{t("modal.other.optional")}</span><input type="number" name="porcentaje_iva" step="0.1" placeholder="0" value={vat} onChange={(event) => setVat(event.target.value)} className={`${input} mt-2 focus:border-purple-500`} /></label></div>
        <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">{t("modal.other.description")}<textarea name="descripcion" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("modal.other.descPlaceholder")} className={`${input} mt-2 resize-none focus:border-purple-500`} /></label>
        <FormFooter onClose={onClose} busy={busy} disabled={loadingExisting || Boolean(loadError)} label={t("common.save")} tone="purple" />
      </form>
    </ModalFrame>
  );
}

function ProductModal({ projectId, demo, onClose, onSaved }: { projectId: number | null; demo: boolean; onClose: () => void; onSaved: () => void }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  useDialogOpen(true, dialogRef, onClose);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || demo) return;
    setBusy(true);
    try {
      await apiJson("/api/products/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, name }) });
      onSaved();
    } catch (cause) {
      window.alert(`${t("common.saveErrorPrefix")} ${apiErrorMessage(cause, t("modal.product.createError"))}`);
    } finally { setBusy(false); }
  }
  const icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73V8Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22v-10" /></svg>;
  return <ModalFrame dialogRef={dialogRef} maxWidth="max-w-md" title={t("modal.product.title")} icon={icon} onClose={onClose}><form className="space-y-6 p-6" onSubmit={submit}><label className="block text-xs font-medium uppercase tracking-wider text-slate-400">{t("modal.product.name")}<input type="text" name="nombre" required value={name} onChange={(event) => setName(event.target.value)} placeholder={t("modal.product.placeholder")} className={`${input} mt-2 placeholder:text-slate-600 focus:border-primary-500`} /></label><div className="flex justify-end border-t border-white/5 pt-4"><button type="submit" disabled={busy} className="flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary-500/20 transition-all hover:bg-primary-600 disabled:opacity-50"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>{t("modal.product.save")}</button></div></form></ModalFrame>;
}

function LineItems({ title, items, products, kind, onAdd, onRemove, onChange, onProductChange }: { title: string; items: Item[]; products: Product[]; kind: "sale" | "purchase"; onAdd: () => void; onRemove: (index: number) => void; onChange: (index: number, key: keyof Item, value: string) => void; onProductChange: (index: number, productId: string) => void }) {
  return <div className="border-t border-white/5 pt-6"><div className="mb-4 flex items-center justify-between"><h4 className="text-sm font-bold uppercase tracking-wider text-white">{title}</h4><button type="button" onClick={onAdd} className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/10"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>{t("common.addProduct")}</button></div><div className="max-h-[40vh] space-y-4 overflow-y-auto pr-2">{items.map((item, index) => <div key={index} className={`mb-4 grid grid-cols-1 items-end gap-2 border-b border-white/5 pb-4 md:mb-2 md:grid-cols-12 md:border-0 md:pb-0 ${kind}-item-row`}><div className="grid grid-cols-1 gap-2 md:col-span-11 md:grid-cols-11"><label className="block md:col-span-5"><span className="mb-1 block text-xs text-slate-500">{t("item.product")}</span><select value={item.productId} onChange={(event) => onProductChange(index, event.target.value)} className={`${itemInput} focus:border-primary-500`}>{(() => { const selectable = products.filter((product) => kind === "purchase" || product.stock > 0 || String(product.id) === item.productId); return <><option value="">{selectable.length ? t("common.select") : t("modal.sale.noProducts")}</option>{selectable.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</>; })()}</select></label><div className="grid grid-cols-3 gap-2 md:contents"><label className="md:col-span-2"><span className="mb-1 block text-xs text-slate-500">{t("item.units")}</span><input type="number" min="0.01" step="0.01" value={item.units} onChange={(event) => onChange(index, "units", event.target.value)} placeholder="1" className={`${itemInput} focus:border-primary-500`} /></label><label className="md:col-span-2"><span className="mb-1 block text-xs text-slate-500">{t("item.price")}</span><input type="number" min="0" step="0.01" value={item.price} onChange={(event) => onChange(index, "price", event.target.value)} placeholder="0.00" className={`${itemInput} focus:border-primary-500`} /></label><label className="md:col-span-2"><span className="mb-1 block text-xs text-slate-500">{t("item.vat")}</span><input type="number" value={item.tax} onChange={(event) => onChange(index, "tax", event.target.value)} className={`${itemInput} focus:border-primary-500`} /></label></div></div><div className="flex justify-end pb-2 md:col-span-1"><button type="button" onClick={() => onRemove(index)} className="text-red-400 hover:text-red-300" aria-label={t("common.delete")}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button></div></div>)}</div></div>;
}

function FormFooter({ onClose, busy, disabled = false, label, tone }: { onClose: () => void; busy: boolean; disabled?: boolean; label: string; tone: "indigo" | "emerald" | "purple" }) {
  const color = tone === "indigo" ? "bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20" : tone === "emerald" ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20" : "bg-purple-500 hover:bg-purple-600 shadow-purple-500/20";
  return <div className="flex justify-end gap-3 border-t border-white/5 pt-6"><button type="button" onClick={onClose} className="rounded-xl px-6 py-2 text-slate-400 transition-all hover:bg-white/5 hover:text-white">{t("common.cancel")}</button><button type="submit" disabled={busy || disabled} className={`rounded-xl px-6 py-2 font-bold text-white shadow-lg transition-all disabled:opacity-50 ${color}`}>{busy ? t("common.loading") : label}</button></div>;
}
