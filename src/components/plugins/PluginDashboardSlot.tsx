"use client";

import { useEffect, useState } from "react";

import { apiErrorMessage, apiJson } from "@/lib/client-api";
import type { PluginDashboardView, PluginInstallation } from "@/lib/plugins";

const tones = {
  neutral: { text: "text-slate-200", glow: "bg-slate-400" },
  primary: { text: "text-primary-300", glow: "bg-primary-500" },
  rose: { text: "text-rose-400", glow: "bg-rose-500" },
  emerald: { text: "text-emerald-400", glow: "bg-emerald-500" },
  amber: { text: "text-amber-400", glow: "bg-amber-500" },
};

export default function PluginDashboardSlot({ projectId, plugin, fallback }: { projectId: number; plugin: PluginInstallation; fallback: React.ReactNode }) {
  const requestKey = `${projectId}:${plugin.pluginId}:${plugin.sourceSha}`;
  const [result, setResult] = useState<{ key: string; view: PluginDashboardView | null; error: string | null } | null>(null);
  const [period, setPeriod] = useState("");

  useEffect(() => {
    let active = true;
    void apiJson<PluginDashboardView>("/api/plugins/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, pluginId: plugin.pluginId }),
    }).then((result) => {
      if (!active) return;
      setResult({ key: requestKey, view: result, error: null });
      setPeriod(result.defaultPeriod);
    }).catch((cause) => {
      if (active) setResult({ key: requestKey, view: null, error: apiErrorMessage(cause, `${plugin.name} could not render its dashboard extension.`) });
    });
    return () => { active = false; };
  }, [plugin.pluginId, plugin.sourceSha, plugin.name, projectId, requestKey]);

  const view = result?.key === requestKey ? result.view : null;
  const error = result?.key === requestKey ? result.error : null;
  if (error) return <><div role="alert" className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-5 py-4 text-sm text-amber-200"><strong className="font-semibold">{plugin.name} is active but unavailable.</strong><span className="mt-1 block text-amber-200/60">{error} The standard dashboard is shown instead.</span></div>{fallback}</>;
  if (!view) return <div className="mb-8 grid animate-pulse grid-cols-1 gap-4 md:grid-cols-3" aria-busy="true" aria-label={`Loading ${plugin.name}`}><div className="h-32 rounded-3xl bg-white/5" /><div className="h-32 rounded-3xl bg-white/5" /><div className="h-32 rounded-3xl bg-white/5" /></div>;

  const selected = view.periods.find((item) => item.id === period) ?? view.periods[0];
  return <section className="mb-8" aria-labelledby={`plugin-${plugin.pluginId}-heading`}>
    <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div>{view.eyebrow && <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-primary-400"><span className="h-1.5 w-1.5 rounded-full bg-primary-400 shadow-[0_0_12px_rgba(129,140,248,.8)]" />{view.eyebrow}</div>}<h2 id={`plugin-${plugin.pluginId}-heading`} className="text-xl font-semibold text-white">{view.title}</h2>{view.description && <p className="mt-1 text-sm text-slate-500">{view.description}</p>}</div><div className="flex w-fit rounded-xl border border-white/[0.07] bg-white/[0.025] p-1" role="group" aria-label={`${plugin.name} reporting period`}>{view.periods.map((item) => <button key={item.id} type="button" onClick={() => setPeriod(item.id)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${selected.id === item.id ? "bg-primary-500/15 text-primary-300" : "text-slate-600 hover:text-slate-300"}`}>{item.label}</button>)}</div></div>
    <div className={`grid gap-4 ${selected.metrics.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>{selected.metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}</div>
    <div className="mt-4 overflow-hidden rounded-3xl border border-white/[0.07] bg-[#14151a]/70"><div className="flex items-center justify-between border-b border-white/5 px-5 py-4"><h3 className="text-sm font-semibold text-slate-200">{view.table.title}</h3>{view.table.caption && <span className="text-xs text-slate-600">{view.table.caption}</span>}</div>{view.table.rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-sm"><thead className="text-[10px] uppercase tracking-wider text-slate-600"><tr>{view.table.columns.map((column, index) => <th key={`${column.label}-${index}`} className={`px-5 py-3 ${column.align === "right" ? "text-right" : "text-left"}`}>{column.label}</th>)}</tr></thead><tbody>{view.table.rows.map((row, rowIndex) => <tr key={rowIndex} className="border-t border-white/[0.045]">{row.cells.map((cell, cellIndex) => { const tone = cell.tone ? tones[cell.tone].text : "text-slate-400"; return <td key={cellIndex} className={`px-5 py-3 ${view.table.columns[cellIndex]?.align === "right" ? "text-right" : "text-left"} ${tone} ${cellIndex === 0 ? "font-semibold" : ""}`}>{cell.value}</td>; })}</tr>)}</tbody></table></div> : <div className="px-6 py-12 text-center text-sm text-slate-600">{view.table.emptyMessage}</div>}</div>
  </section>;
}

function MetricCard({ metric }: { metric: PluginDashboardView["periods"][number]["metrics"][number] }) {
  const tone = tones[metric.tone];
  return <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#14151a] p-6"><span className={`absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10 blur-3xl ${tone.glow}`} /><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">{metric.label}</p><p className={`relative mt-3 font-mono text-2xl font-bold tracking-tight ${tone.text}`}>{metric.value}</p>{metric.detail && <p className="mt-1 text-xs text-slate-600">{metric.detail}</p>}</div>;
}
