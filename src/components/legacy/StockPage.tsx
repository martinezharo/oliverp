"use client";

import { useEffect, useState } from "react";

import { apiErrorMessage, apiJson } from "@/lib/client-api";
import { mockStock } from "@/lib/mock-data";
import { ui } from "@/i18n/ui";

import { toStockRow, type StockApiRow } from "./apiRows";
import ProductHistoryModal from "./ProductHistoryModal";
import StockTable from "./StockTable";
import type { StockRow } from "./types";

const t = (key: string) => ui.en[key] ?? key;

// The public API caps `page_size` at 100, so the whole inventory is read page
// by page rather than in one oversized request.
const PAGE_SIZE = 100;

async function fetchStock(projectId: number): Promise<StockRow[]> {
  const rows: StockRow[] = [];
  for (let page = 1; ; page += 1) {
    const body = await apiJson<{ data?: StockApiRow[]; pagination?: { has_more?: boolean } }>(
      `/api/v1/stock?proyecto_id=${projectId}&page=${page}&page_size=${PAGE_SIZE}`,
    );
    const batch = body.data ?? [];
    rows.push(...batch.map(toStockRow));
    if (!batch.length || !body.pagination?.has_more) return rows;
  }
}

export default function StockPage({ projectId, demo, reloadKey, onNewProduct }: { projectId: number; demo: boolean; reloadKey: number; onNewProduct: () => void }) {
  const [data, setData] = useState<StockRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [historyProduct, setHistoryProduct] = useState<StockRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = demo ? mockStock.filter((row) => row.proyecto_id === projectId) : await fetchStock(projectId);
        if (!cancelled) setData(rows);
      } catch (cause) {
        if (!cancelled) { setData([]); setError(apiErrorMessage(cause, t("common.errorLoadingData"))); }
      }
    })();
    return () => { cancelled = true; };
  }, [demo, projectId, reloadKey]);

  return (
    <>
      <div className="mb-8 flex items-center justify-between"><div><h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-3xl font-bold text-transparent">{t("stock.title")}</h1><p className="mt-2 text-slate-400">{t("stock.subtitle")}</p></div><div className="flex gap-3"><button type="button" onClick={onNewProduct} className="flex cursor-pointer items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-primary-500/20 transition-all hover:bg-primary-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>{t("stock.newProduct")}</button></div></div>
      {error && <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">{t("common.errorLoadingData")}: {error}</div>}
      <StockTable data={data} onOpenHistory={setHistoryProduct} />
      <ProductHistoryModal product={historyProduct} onClose={() => setHistoryProduct(null)} onChanged={() => setData((rows) => rows)} />
    </>
  );
}
