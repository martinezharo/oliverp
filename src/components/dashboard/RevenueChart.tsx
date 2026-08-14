"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useErpContext } from "@/hooks/useErpContext";
import { getMockEvolution } from "@/lib/mock-data";
import { useT } from "@/i18n/LocaleProvider";

type EvolutionRow = { date: string; ingresos: number; urp: number };

/**
 * Chart.js is a heavy dependency, so it stays a dynamic import — but the
 * download now starts as soon as the component mounts, in parallel with the
 * data query, instead of only after the data came back.
 */
const chartModule = () => import("chart.js/auto").then((module) => module.default);

function startOf(days: number): string {
  const start = new Date();
  start.setDate(start.getDate() - days);
  return start.toISOString().slice(0, 10);
}

/** Days without activity are absent from the read model; the chart needs them. */
function fillGaps(rows: Array<{ dia: string; ingresos: number; urp: number }>, days: number): EvolutionRow[] {
  const byDay = new Map(rows.map((row) => [row.dia, row]));
  const filled: EvolutionRow[] = [];
  const current = new Date(startOf(days));
  const end = new Date();
  while (current <= end) {
    const date = current.toISOString().slice(0, 10);
    const row = byDay.get(date);
    filled.push({ date, ingresos: row?.ingresos ?? 0, urp: row?.urp ?? 0 });
    current.setDate(current.getDate() + 1);
  }
  return filled;
}

export default function RevenueChart({ projectId }: { projectId: number }) {
  const { t, formatCurrency, formatCompact, formatDate } = useT();
  const { demo } = useErpContext();
  const [days, setDays] = useState(30);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<{ destroy: () => void } | null>(null);

  const fromDate = useMemo(() => startOf(days), [days]);
  const remote = useQuery(
    api.session.financeEvolution,
    !demo && projectId ? { projectLegacyId: projectId, fromDate } : "skip",
  );
  const data = useMemo(() => {
    if (demo) return getMockEvolution(days);
    return remote === undefined ? undefined : fillGaps(remote, days);
  }, [days, demo, remote]);

  const total = useMemo(
    () => (data ?? []).reduce((sum, row) => sum + row.ingresos, 0),
    [data],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    let cancelled = false;

    void chartModule().then((Chart) => {
      if (cancelled) return;
      const context = canvas.getContext("2d");
      if (!context) return;
      chartRef.current?.destroy();

      const gradient = context.createLinearGradient(0, 0, 0, 400);
      gradient.addColorStop(0, "rgba(16, 185, 129, 0.2)");
      gradient.addColorStop(1, "rgba(16, 185, 129, 0)");

      chartRef.current = new Chart(canvas, {
        type: "line",
        data: {
          labels: data.map((row) => formatDate(row.date, { day: "2-digit", month: "short" })),
          datasets: [{ label: t("finance.income"), data: data.map((row) => row.ingresos), borderColor: "#10b981", backgroundColor: gradient, borderWidth: 2, tension: 0.4, fill: true, pointBackgroundColor: "#10b981", pointBorderColor: "#14151a", pointBorderWidth: 2, pointRadius: 0, pointHoverRadius: 6 }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: "index" },
          plugins: { legend: { display: false }, tooltip: { backgroundColor: "#1e293b", titleColor: "#f8fafc", bodyColor: "#cbd5e1", borderColor: "rgba(255,255,255,0.1)", borderWidth: 1, padding: 10, displayColors: true, callbacks: { label: (context) => `${context.dataset.label ? `${context.dataset.label}: ` : ""}${context.parsed.y === null ? "" : formatCurrency(context.parsed.y)}` } } },
          scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: "#64748b", maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } }, y: { grid: { color: "rgba(255, 255, 255, 0.05)" }, border: { display: false }, beginAtZero: true, ticks: { color: "#64748b", callback: (value) => `${formatCompact(Number(value))}€` } } },
        },
      });
    });

    return () => { cancelled = true; };
    // The formatters and `t` are per-language constants, so listing them here
    // does not make the chart rebuild on every render — only when the reader
    // switches language, which is exactly when its axes should be redrawn.
  }, [data, formatCompact, formatCurrency, formatDate, t]);

  useEffect(() => () => { chartRef.current?.destroy(); chartRef.current = null; }, []);

  const periods = [7, 30, 90];
  return (
    <section className="group relative mb-8 rounded-3xl border border-white/5 bg-[#14151a] p-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg></div>
          <div>
            <h2 className="text-lg font-bold text-white">{t("chart.title")}</h2>
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-400">{t("chart.totalPeriod")}</p>
              <span className="text-xs font-bold text-emerald-400">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
        <div className="flex rounded-lg border border-white/5 bg-white/5 p-1">
          {periods.map((period) => (
            <button key={period} type="button" onClick={() => setDays(period)} data-active={days === period ? "true" : undefined} className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-400 transition-all hover:text-white data-[active=true]:bg-white/10 data-[active=true]:text-white data-[active=true]:shadow-sm">
              {t(`chart.days${period}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="relative h-[300px] w-full">
        <canvas ref={canvasRef} />
        {data === undefined && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#14151a]/50 backdrop-blur-sm transition-opacity duration-300">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
              <span className="text-xs text-slate-400">{t("common.loadingData")}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
