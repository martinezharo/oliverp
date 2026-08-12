"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import EmptyProject from "@/components/ui/EmptyProject";
import Pagination from "@/components/ui/Pagination";
import { t } from "@/i18n/t";
import { useErpContext } from "@/hooks/useErpContext";
import { useFinanceRows, useTransactions } from "@/hooks/useErpData";
import { filterTransactions } from "@/lib/transactions";

import DailyView from "./DailyView";
import FlatView, { FlatPager, PAGE_SIZE_FLAT } from "./FlatView";
import TransactionFilters, { emptyFilters, type FilterState } from "./TransactionFilters";

const PAGE_SIZE_DAILY = 15;
const VIEW_MODE_KEY = "txn-view-mode";

type Mode = "daily" | "list";

function optionalAmount(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function TransactionsPage() {
  const { projectId, demo, openModal } = useErpContext();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number.parseInt(searchParams?.get("page") || "1", 10));
  const [mode, setMode] = useState<Mode>("daily");
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [flatPage, setFlatPage] = useState(1);

  const financeRows = useFinanceRows();
  // The list view subscribes to the project's transactions once; filtering and
  // paging then happen locally, so a keystroke in the filters no longer costs
  // a request.
  const allTransactions = useTransactions();

  useEffect(() => {
    try {
      const savedMode = window.localStorage.getItem(VIEW_MODE_KEY);
      if (savedMode === "daily" || savedMode === "list") {
        // The previous frontend applied this preference after page load; preserve that behavior
        // without making the server-rendered HTML depend on browser storage.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMode(savedMode);
      }
    } catch {
      // Private browsing can deny access to localStorage.
    }
  }, []);

  const daily = useMemo(
    () => (financeRows ?? []).slice((page - 1) * PAGE_SIZE_DAILY, page * PAGE_SIZE_DAILY),
    [financeRows, page],
  );

  const filtered = useMemo(
    () => filterTransactions(allTransactions ?? [], {
      ...filters,
      amountMin: optionalAmount(filters.amountMin),
      amountMax: optionalAmount(filters.amountMax),
    }),
    [allTransactions, filters],
  );
  const flat = useMemo(
    () => filtered.slice((flatPage - 1) * PAGE_SIZE_FLAT, flatPage * PAGE_SIZE_FLAT),
    [filtered, flatPage],
  );

  const channels = useMemo(
    () => Array.from(new Set((allTransactions ?? []).map((item) => item.channel).filter(Boolean))).sort(),
    [allTransactions],
  );

  function changeMode(next: Mode) {
    setMode(next);
    try { window.localStorage.setItem(VIEW_MODE_KEY, next); } catch { /* private browsing */ }
  }

  function changeFilter(key: keyof FilterState, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setFlatPage(1);
  }

  function clearFilters() {
    setFilters(emptyFilters);
    setFlatPage(1);
  }

  const loading = mode === "daily" ? financeRows === undefined : allTransactions === undefined;

  if (!projectId) return <EmptyProject />;

  return (
    <>
      <div className="mb-6 lg:mb-8">
        <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-2xl font-bold text-transparent lg:text-3xl">{t("transactions.title")}</h1>
        <p className="mt-1 text-sm text-slate-400 lg:text-base">{t("transactions.subtitle")}</p>
      </div>

      <TransactionFilters
        mode={mode}
        setMode={changeMode}
        channels={channels}
        filters={filters}
        onChange={changeFilter}
        onClear={clearFilters}
      />

      {loading ? (
        <ListSkeleton />
      ) : mode === "daily" ? (
        <>
          <DailyView daily={daily} transactions={allTransactions ?? []} />
          <div className="mt-8">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil((financeRows?.length ?? 0) / PAGE_SIZE_DAILY)}
              baseUrl={`/transacciones?projectId=${projectId}`}
            />
          </div>
        </>
      ) : (
        <>
          <FlatView rows={flat} demo={demo} onOpenModal={openModal} />
          <FlatPager page={flatPage} total={filtered.length} onPageChange={setFlatPage} />
        </>
      )}
    </>
  );
}

function ListSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label={t("common.loadingData")}>
      {[0, 1, 2, 3, 4, 5].map((slot) => <div key={slot} className="h-24 rounded-2xl bg-white/5" />)}
    </div>
  );
}
