"use client";

import { useEffect, useRef, useState } from "react";

import { apiErrorMessage, apiJson } from "@/lib/client-api";
import { useT } from "@/i18n/LocaleProvider";
import type { Translate } from "@/i18n/t";

/** What the shell hands every operation modal. */
export type OperationModalProps = {
  /** The operation being edited, or null when creating a new one. */
  transactionId: number | null;
  projectId: number | null;
  demo: boolean;
  onClose: () => void;
  onSaved: () => void;
};

/** A product as offered by the operation forms. */
export type Product = { id: number; name: string; price: number; stock: number };

/** One editable line of a sale or purchase. Values stay strings while typing. */
export type Item = { productId: string; units: string; price: string; tax: string };

export type SaleRecord = {
  fecha: string;
  canal: string;
  venta_detalle?: Array<{
    producto_id: number;
    unidades: number;
    precio_unitario_venta: number;
    porcentaje_iva?: number;
  }>;
};

export type PurchaseRecord = {
  fecha: string;
  compra_detalle?: Array<{
    producto_id: number;
    unidades: number;
    precio_unitario_compra: number;
    porcentaje_iva?: number;
  }>;
};

export type OtherRecord = {
  tipo: "ingreso" | "gasto";
  fecha: string;
  concepto: string;
  importe: number;
  porcentaje_iva?: number;
  descripcion?: string | null;
};

export const emptyItem = (): Item => ({ productId: "", units: "", price: "", tax: "21" });

/**
 * Loads the record an edit modal starts from.
 *
 * The read endpoints are scoped by project, so the request has to carry
 * `projectId` next to the id — a bare id is rejected with a 400 and the form
 * would open empty over an existing operation. While the active project is
 * still unknown the hook stays in its loading state instead of firing an
 * incomplete request; the shell remounts the modal once the project resolves.
 */
export function useExistingRecord<T>(
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
  const { t } = useT();
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
        const message = apiErrorMessage(t, cause, t(errorKey));
        setError(message);
        window.alert(message);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // `t` is a cached, per-language constant, so it never restarts this.
  }, [demo, endpoint, errorKey, projectId, t, transactionId]);

  return { loading, error };
}

/** Reports a failed save the way every operation form does. */
export function reportSaveError(t: Translate, cause: unknown, fallbackKey = "common.unknown") {
  window.alert(`${t("common.saveErrorPrefix")} ${apiErrorMessage(t, cause, t(fallbackKey))}`);
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

export function itemTotal(items: Item[]): string {
  return items.reduce((sum, item) => sum + Number(item.units || 0) * Number(item.price || 0), 0).toFixed(2);
}

/** Splits a known total over the selected products using their reference prices. */
export function distributeTotal(items: Item[], total: string, products: Product[]): Item[] {
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

/** The product catalogue and known sales channels for the active project. */
export function useInitData(projectId: number | null) {
  const [products, setProducts] = useState<Product[]>([]);
  const [channels, setChannels] = useState<string[]>([]);

  useEffect(() => {
    void apiJson<{ products: Product[]; channels: string[] }>(`/api/sales/init-data?projectId=${projectId ?? ""}`)
      .then((data) => { setProducts(data.products ?? []); setChannels(data.channels ?? []); })
      .catch(() => { setProducts([]); setChannels([]); });
  }, [projectId]);

  return { products, channels };
}
