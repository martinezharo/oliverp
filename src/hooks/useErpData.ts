"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo } from "react";

import type { FinanceRow, StockRow } from "@/types/erp";
import { useDemoDataset } from "@/hooks/useDemoDataset";
import { useErpContext } from "@/hooks/useErpContext";
import { financeRows, stockRows, transactionSources } from "@/lib/demo/domain";
import { normalizeTransactions, type NormalizedTransaction } from "@/lib/transactions";

/**
 * Reactive reads for the current project.
 *
 * Each hook returns `undefined` while the first result is in flight and an
 * array afterwards. Convex keeps the value cached per argument set, so moving
 * between pages and coming back paints immediately, and a mutation made
 * anywhere pushes the new rows here without a refetch.
 *
 * Demo mode reads the same shapes out of the in-memory sample business
 * instead. Both branches are computed by the same code from the same records,
 * so a demo screen is never a different screen — only a different source.
 */

/** The daily finance read model, newest day first. */
export function useFinanceRows(): FinanceRow[] | undefined {
  const { projectId, demo } = useErpContext();
  const dataset = useDemoDataset();
  const remote = useQuery(
    api.session.dailyFinances,
    !demo && projectId ? { projectLegacyId: projectId } : "skip",
  );

  return useMemo(() => {
    const rows = demo
      ? projectId
        ? financeRows(dataset, projectId)
        : []
      : remote;
    if (!rows) return undefined;
    return [...rows].sort((a, b) => b.dia.localeCompare(a.dia));
  }, [dataset, demo, projectId, remote]);
}

export function useStockRows(): StockRow[] | undefined {
  const { projectId, demo } = useErpContext();
  const dataset = useDemoDataset();
  const remote = useQuery(
    api.session.stock,
    !demo && projectId ? { projectLegacyId: projectId } : "skip",
  );

  return useMemo(() => {
    if (demo) return projectId ? stockRows(dataset, projectId) : [];
    return remote;
  }, [dataset, demo, projectId, remote]);
}

/**
 * Every sale, purchase and manual entry flattened into one list. `range`
 * narrows the query server-side, which is what the day-detail panels use.
 */
export function useTransactions(range?: { fromDate?: string; toDate?: string }): NormalizedTransaction[] | undefined {
  const { projectId, demo } = useErpContext();
  const dataset = useDemoDataset();
  const fromDate = range?.fromDate;
  const toDate = range?.toDate;
  const remote = useQuery(
    api.session.transactionSources,
    !demo && projectId
      ? { projectLegacyId: projectId, ...(fromDate ? { fromDate } : {}), ...(toDate ? { toDate } : {}) }
      : "skip",
  );

  return useMemo(() => {
    const sources = demo ? (projectId ? transactionSources(dataset, projectId) : { sales: [], purchases: [], others: [] }) : remote;
    if (!sources) return undefined;
    const rows = normalizeTransactions(sources);
    // The remote query narrows the range itself; the demo list is filtered
    // here so both branches answer the same question.
    if (!demo || (!fromDate && !toDate)) return rows;
    return rows.filter((row) => (!fromDate || row.date >= fromDate) && (!toDate || row.date <= toDate));
  }, [dataset, demo, fromDate, projectId, remote, toDate]);
}
