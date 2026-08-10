"use client";

import { useEffect, useRef } from "react";

import { apiJson } from "@/lib/client-api";
import { ui } from "@/i18n/ui";

const t = (key: string) => ui.en[key] ?? key;
const locale = "en-GB";

type EvolutionRow = { date: string; ingresos: number; urp: number };

export default function RevenueChart({ projectId }: { projectId: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<{ destroy: () => void } | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const totalRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    const load = async (days: number) => {
      if (loaderRef.current) loaderRef.current.classList.remove("opacity-0", "pointer-events-none");
      try {
        const data = await apiJson<EvolutionRow[]>(`/api/stats/evolution?projectId=${projectId}&days=${days}`);
        if (cancelled) return;
        const Chart = (await import("chart.js/auto")).default;
        if (cancelled) return;
        chartRef.current?.destroy();
        const context = canvas.getContext("2d");
        if (!context) return;
        const labels = data.map((row) => new Date(row.date).toLocaleDateString(locale, { day: "2-digit", month: "short" }));
        const ingresos = data.map((row) => row.ingresos);
        const total = ingresos.reduce((sum, value) => sum + value, 0);
        if (totalRef.current) totalRef.current.textContent = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(total);
        const gradient = context.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, "rgba(16, 185, 129, 0.2)");
        gradient.addColorStop(1, "rgba(16, 185, 129, 0)");
        chartRef.current = new Chart(canvas, {
          type: "line",
          data: { labels, datasets: [{ label: t("finance.income"), data: ingresos, borderColor: "#10b981", backgroundColor: gradient, borderWidth: 2, tension: 0.4, fill: true, pointBackgroundColor: "#10b981", pointBorderColor: "#14151a", pointBorderWidth: 2, pointRadius: 0, pointHoverRadius: 6 }] },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: "index" },
            plugins: { legend: { display: false }, tooltip: { backgroundColor: "#1e293b", titleColor: "#f8fafc", bodyColor: "#cbd5e1", borderColor: "rgba(255,255,255,0.1)", borderWidth: 1, padding: 10, displayColors: true, callbacks: { label: (context) => `${context.dataset.label ? `${context.dataset.label}: ` : ""}${context.parsed.y === null ? "" : new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(context.parsed.y)}` } } },
            scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: "#64748b", maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } }, y: { grid: { color: "rgba(255, 255, 255, 0.05)" }, border: { display: false }, beginAtZero: true, ticks: { color: "#64748b", callback: (value) => `${new Intl.NumberFormat(locale, { notation: "compact", compactDisplay: "short" }).format(Number(value))}€` } } },
          },
        });
      } catch {
        // Keep the original loading surface quiet if an optional chart request fails.
      } finally {
        if (loaderRef.current) loaderRef.current.classList.add("opacity-0", "pointer-events-none");
      }
    };

    const buttons = Array.from(canvas.closest("section")?.querySelectorAll<HTMLButtonElement>(".period-btn") ?? []);
    for (const button of buttons) button.addEventListener("click", () => { for (const item of buttons) item.removeAttribute("data-active"); button.setAttribute("data-active", "true"); void load(Number(button.dataset.days || "30")); });
    const chartObserver = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) { chartObserver.disconnect(); void load(30); } }, { rootMargin: "200px" });
    chartObserver.observe(canvas);

    return () => { cancelled = true; chartObserver.disconnect(); for (const button of buttons) button.replaceWith(button.cloneNode(true)); chartRef.current?.destroy(); chartRef.current = null; };
  }, [projectId]);

  return (
    <section className="group relative mb-8 rounded-3xl border border-white/5 bg-[#14151a] p-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3"><div className="rounded-lg bg-blue-500/10 p-2 text-blue-400"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg></div><div><h3 className="text-lg font-bold text-white">{t("chart.title")}</h3><div className="flex items-center gap-2"><p className="text-xs text-slate-400">{t("chart.totalPeriod")}</p><span ref={totalRef} className="text-xs font-bold text-emerald-400">0,00€</span></div></div></div>
        <div className="flex rounded-lg border border-white/5 bg-white/5 p-1"><button className="period-btn rounded-md px-3 py-1.5 text-xs font-medium text-slate-400 transition-all hover:text-white data-[active=true]:bg-white/10 data-[active=true]:text-white data-[active=true]:shadow-sm" data-days="7">{t("chart.days7")}</button><button className="period-btn rounded-md px-3 py-1.5 text-xs font-medium text-slate-400 transition-all hover:text-white data-[active=true]:bg-white/10 data-[active=true]:text-white data-[active=true]:shadow-sm" data-days="30" data-active="true">{t("chart.days30")}</button><button className="period-btn rounded-md px-3 py-1.5 text-xs font-medium text-slate-400 transition-all hover:text-white data-[active=true]:bg-white/10 data-[active=true]:text-white data-[active=true]:shadow-sm" data-days="90">{t("chart.days90")}</button></div>
      </div>
      <div className="relative h-[300px] w-full"><canvas ref={canvasRef} /><div ref={loaderRef} className="absolute inset-0 z-10 flex items-center justify-center bg-[#14151a]/50 backdrop-blur-sm transition-opacity duration-300"><div className="flex flex-col items-center gap-2"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" /><span className="text-xs text-slate-400">{t("common.loadingData")}</span></div></div></div>
    </section>
  );
}
