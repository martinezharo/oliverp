"use client";

import { useState } from "react";

import EmptyProject from "@/components/ui/EmptyProject";
import { useT } from "@/i18n/LocaleProvider";
import { useErpContext } from "@/hooks/useErpContext";
import { useStockRows } from "@/hooks/useErpData";

import ProductHistoryModal from "./ProductHistoryModal";
import StockTable from "./StockTable";

import type { StockRow } from "@/types/erp";

export default function StockPage() {
  const { t } = useT();
  const { projectId, openModal } = useErpContext();
  // One subscription for the whole inventory. The paged REST endpoint made the
  // browser walk pages in series on every visit to this route.
  const data = useStockRows();
  const [historyProduct, setHistoryProduct] = useState<StockRow | null>(null);

  if (!projectId) return <EmptyProject />;

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-3xl font-bold text-transparent">{t("stock.title")}</h1>
          <p className="mt-2 text-slate-400">{t("stock.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => openModal("product")}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-primary-500/20 transition-all hover:bg-primary-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          {t("stock.newProduct")}
        </button>
      </div>

      {data === undefined ? <TableSkeleton /> : <StockTable data={data} onOpenHistory={setHistoryProduct} />}

      {/* Adjustments land in Convex, which pushes the new rows back here. */}
      <ProductHistoryModal product={historyProduct} onClose={() => setHistoryProduct(null)} />
    </>
  );
}

function TableSkeleton() {
  const { t } = useT();
  return (
    <div className="animate-pulse space-y-2" aria-busy="true" aria-label={t("common.loadingData")}>
      <div className="h-12 rounded-t-2xl bg-white/5" />
      {[0, 1, 2, 3, 4, 5].map((slot) => <div key={slot} className="h-14 bg-white/[0.03]" />)}
    </div>
  );
}
