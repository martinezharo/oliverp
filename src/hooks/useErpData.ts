"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo } from "react";

import type { FinanceRow, StockRow } from "@/types/erp";
import { useErpContext } from "@/hooks/useErpContext";
import { mockFinanzas, mockStock } from "@/lib/mock-data";
import { normalizeTransactions, type NormalizedTransaction } from "@/lib/transactions";

/**
 * Reactive reads for the current project.
 *
 * Each hook returns `undefined` while the first result is in flight and an
 * array afterwards. Convex keeps the value cached per argument set, so moving
 * between pages and coming back paints immediately, and a mutation made
 * anywhere pushes the new rows here without a refetch.
 */

/** The daily finance read model, newest day first. */
export function useFinanceRows(): FinanceRow[] | undefined {
  const { projectId, demo } = useErpContext();
  const remote = useQuery(
    api.session.dailyFinances,
    !demo && projectId ? { projectLegacyId: projectId } : "skip",
  );

  return useMemo(() => {
    const rows = demo
      ? projectId
        ? mockFinanzas.filter((row) => row.proyecto_id === projectId)
        : []
      : remote;
    if (!rows) return undefined;
    return [...rows].sort((a, b) => b.dia.localeCompare(a.dia));
  }, [demo, projectId, remote]);
}

export function useStockRows(): StockRow[] | undefined {
  const { projectId, demo } = useErpContext();
  const remote = useQuery(
    api.session.stock,
    !demo && projectId ? { projectLegacyId: projectId } : "skip",
  );

  return useMemo(() => {
    if (demo) return projectId ? mockStock.filter((row) => row.proyecto_id === projectId) : [];
    return remote;
  }, [demo, projectId, remote]);
}

/**
 * Every sale, purchase and manual entry flattened into one list. `range`
 * narrows the query server-side, which is what the day-detail panels use.
 */
export function useTransactions(range?: { fromDate?: string; toDate?: string }): NormalizedTransaction[] | undefined {
  const { projectId, demo } = useErpContext();
  const remote = useQuery(
    api.session.transactionSources,
    !demo && projectId
      ? { projectLegacyId: projectId, ...(range?.fromDate ? { fromDate: range.fromDate } : {}), ...(range?.toDate ? { toDate: range.toDate } : {}) }
      : "skip",
  );

  return useMemo(() => {
    if (demo) return [];
    if (!remote) return undefined;
    return normalizeTransactions(remote);
  }, [demo, remote]);
}
