"use client";

import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";

import { useErpContext } from "@/hooks/useErpContext";
import { useHref, useT } from "@/i18n/LocaleProvider";
import { apiErrorMessage, apiJson } from "@/lib/client-api";
import { appPath } from "@/lib/navigation";
import {
  installArgs,
  type PluginInstallation,
  type PluginHook,
  type ResolvedPlugin,
} from "@/lib/plugins";

function hookCopy(hook: PluginHook): { label: string; detail: string } {
  return {
    label: `VAT-only concept: ${hook.concept}`,
    detail: "Keeps its VAT in tax totals while excluding its gross amount from income, expenses, balance, and URP.",
  };
}

export default function PluginsPage() {
  // Only the API error is translated: the rest of this screen's copy is still
  // written in English in the markup and has no keys yet.
  const { t } = useT();
  const href = useHref();
  const { projectId, demo } = useErpContext();
  const installations = useQuery(api.plugins.list, !demo && projectId ? { projectLegacyId: projectId } : "skip");
  const installPlugin = useMutation(api.plugins.install);
  const uninstallPlugin = useMutation(api.plugins.uninstall);
  const setPluginEnabled = useMutation(api.plugins.setEnabled);
  const [repository, setRepository] = useState("");
  const [pending, setPending] = useState<ResolvedPlugin | null>(null);
  const [removing, setRemoving] = useState<PluginInstallation | null>(null);
  const [busy, setBusy] = useState(false);
  const [changing, setChanging] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = demo ? [] : installations;
  const loading = !demo && projectId !== null && installations === undefined;

  async function resolve(value: string) {
    if (!projectId || demo) return;
    setBusy(true);
    setError(null);
    try {
      const plugin = await apiJson<ResolvedPlugin>("/api/plugins/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryUrl: value.trim() }),
      });
      setPending(plugin);
    } catch (cause) {
      setError(apiErrorMessage(t, cause, "The private plugin manifest could not be loaded."));
    } finally {
      setBusy(false);
    }
  }

  async function confirmInstall() {
    if (!pending || !projectId || demo) return;
    setBusy(true);
    setError(null);
    try {
      await installPlugin(installArgs(projectId, pending));
      setPending(null);
      setRepository("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The plugin could not be added.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(plugin: PluginInstallation) {
    if (!projectId || demo || changing) return;
    setChanging(plugin.pluginId);
    setError(null);
    try {
      await setPluginEnabled({ projectLegacyId: projectId, pluginId: plugin.pluginId, enabled: !plugin.enabled });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The plugin state could not be changed.");
    } finally {
      setChanging(null);
    }
  }

  async function confirmUninstall() {
    if (!removing || !projectId || demo) return;
    setBusy(true);
    setError(null);
    try {
      await uninstallPlugin({ projectLegacyId: projectId, pluginId: removing.pluginId });
      setRemoving(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The plugin could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-400">
            <LockIcon className="h-3.5 w-3.5" /> Private extensions
          </div>
          <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent">Plugins</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Connect your own private repositories. Their validated behavior applies to OlivERP and persists for the selected project. There is no public catalog.</p>
        </div>
        <Link href={href(appPath("documentacion/plugins"))} className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-primary-500/30 hover:text-white">Plugin documentation <ArrowIcon /></Link>
      </header>

      {!projectId ? <EmptyState title="Select a project" detail="Private plugins are added and activated independently for each project." /> : (
        <>
          <section className="overflow-hidden rounded-3xl border border-white/[0.07] bg-[#14151a]/55">
            <div className="border-b border-white/5 px-6 py-5"><h2 className="text-lg font-semibold text-white">Add a private plugin</h2><p className="mt-1 text-sm text-slate-500">Paste a private GitHub repository you own. OlivERP reviews every declared behavior hook before installation.</p></div>
            <form onSubmit={(event) => { event.preventDefault(); void resolve(repository); }} className="p-6">
              <div className="flex flex-col gap-3 sm:flex-row"><label className="sr-only" htmlFor="plugin-repository">Private GitHub repository</label><input id="plugin-repository" type="url" required placeholder="https://github.com/your-account/private-plugin" value={repository} onChange={(event) => setRepository(event.target.value)} disabled={demo} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-700 focus:border-primary-500/50 disabled:cursor-not-allowed disabled:opacity-50" /><button type="submit" disabled={busy || demo} className="rounded-xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-500/15 transition-colors hover:bg-primary-400 disabled:cursor-not-allowed disabled:opacity-40">{busy ? "Checking repository…" : "Review plugin"}</button></div>
              <p className="mt-3 flex items-center gap-2 text-xs text-slate-600"><LockIcon className="h-3.5 w-3.5" /> Private repositories are read through the OlivERP GitHub App with read-only contents access.</p>
              {demo && <p className="mt-3 text-xs text-amber-400/80">Adding plugins is disabled in demo mode.</p>}
            </form>
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between"><div><h2 className="text-lg font-semibold text-white">Your plugins</h2><p className="mt-1 text-sm text-slate-500">Active hooks adjust project behavior without replacing OlivERP&apos;s interface.</p></div>{rows && <span className="rounded-full border border-white/5 bg-white/[0.025] px-3 py-1 text-xs text-slate-500">{rows.length} added</span>}</div>
            {loading ? <div className="grid gap-4 md:grid-cols-2"><PluginSkeleton /><PluginSkeleton /></div> : !rows?.length ? <EmptyState title="No private plugins added" detail="Paste one of your GitHub repositories above to add the first extension." /> : <div className="grid gap-4 md:grid-cols-2">{rows.map((plugin) => <PluginCard key={plugin.pluginId} plugin={plugin} changing={changing === plugin.pluginId} onToggle={() => void toggle(plugin)} onRemove={() => setRemoving(plugin)} />)}</div>}
          </section>
        </>
      )}

      {error && <div role="alert" className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">{error}</div>}
      {pending && <InstallDialog plugin={pending} busy={busy} onClose={() => setPending(null)} onConfirm={() => void confirmInstall()} />}
      {removing && <RemoveDialog plugin={removing} busy={busy} onClose={() => setRemoving(null)} onConfirm={() => void confirmUninstall()} />}
    </div>
  );
}

function InstallDialog({ plugin, busy, onClose, onConfirm }: { plugin: ResolvedPlugin; busy: boolean; onClose: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="install-plugin-title"><div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#14151a] shadow-2xl"><div className="border-b border-white/5 p-6"><div className="flex items-start gap-4"><PluginMark enabled /><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary-400">Review private extension</p><h2 id="install-plugin-title" className="mt-1 text-xl font-semibold text-white">Add {plugin.name}</h2><p className="mt-1 text-sm text-slate-500">Version {plugin.version} · source {plugin.sourceSha.slice(0, 8)}</p></div></div></div><div className="space-y-5 p-6"><PermissionGroup title="Behavior hooks" items={plugin.hooks.map(hookCopy)} /><div className="rounded-2xl border border-primary-500/15 bg-primary-500/[0.04] px-4 py-3 text-xs leading-5 text-slate-500">OlivERP executes only these reviewed hooks inside its trusted data model. The plugin cannot replace screens, access your browser session, inject code, or send project data elsewhere.</div></div><div className="flex justify-end gap-3 border-t border-white/5 bg-white/[0.02] px-6 py-4"><button type="button" disabled={busy} onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button><button type="button" disabled={busy} onClick={onConfirm} className="rounded-xl bg-primary-500 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-400 disabled:opacity-50">{busy ? "Adding…" : "Add and activate"}</button></div></div></div>;
}

function PluginCard({ plugin, changing, onToggle, onRemove }: { plugin: PluginInstallation; changing: boolean; onToggle: () => void; onRemove: () => void }) {
  return <article className={`rounded-3xl border p-6 transition-colors ${plugin.enabled ? "border-primary-500/20 bg-primary-500/[0.035]" : "border-white/[0.07] bg-[#14151a]/55"}`}><div className="flex items-start gap-4"><PluginMark enabled={plugin.enabled} /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-4"><div><h3 className="font-semibold text-white">{plugin.name}</h3><p className="mt-1 text-xs text-slate-600">v{plugin.version} · private repository</p></div><button type="button" role="switch" aria-checked={plugin.enabled} aria-label={`${plugin.enabled ? "Deactivate" : "Activate"} ${plugin.name}`} disabled={changing} onClick={onToggle} className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors disabled:opacity-50 ${plugin.enabled ? "border-primary-400/30 bg-primary-500" : "border-white/10 bg-white/5"}`}><span className={`absolute top-1 h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${plugin.enabled ? "left-1 translate-x-5" : "left-1"}`} /></button></div><p className="mt-3 text-sm leading-6 text-slate-400">{plugin.description}</p><div className="mt-4 space-y-2">{plugin.hooks.map((item) => <div key={`${item.type}:${item.concept}`} className="flex items-start gap-2 text-xs text-slate-500"><span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${plugin.enabled ? "bg-primary-400" : "bg-slate-700"}`} /><span>{hookCopy(item).label}</span></div>)}</div></div></div><div className="mt-5 flex items-center gap-3 border-t border-white/5 pt-4"><a href={plugin.repositoryUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-white"><LockIcon className="h-3.5 w-3.5" /> Repository</a><span className={`text-xs font-semibold ${plugin.enabled ? "text-emerald-400" : "text-slate-600"}`}>{plugin.enabled ? "Active in OlivERP" : "Inactive"}</span><button type="button" onClick={onRemove} className="ml-auto rounded-lg px-2 py-1.5 text-xs text-slate-600 transition-colors hover:bg-red-500/10 hover:text-red-300">Remove</button></div></article>;
}

function PermissionGroup({ title, items }: { title: string; items: Array<{ label: string; detail: string }> }) {
  return <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">{title}</p><div className="space-y-2">{items.map((item) => <div key={item.label} className="rounded-2xl border border-white/5 bg-white/[0.025] p-4"><div className="flex items-center gap-2 text-sm font-medium text-white"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-500/15 text-xs text-primary-300">✓</span>{item.label}</div><p className="mt-1.5 pl-7 text-xs leading-5 text-slate-500">{item.detail}</p></div>)}</div></div>;
}

function RemoveDialog({ plugin, busy, onClose, onConfirm }: { plugin: PluginInstallation; busy: boolean; onClose: () => void; onConfirm: () => void }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true"><div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#14151a] p-6 shadow-2xl"><h2 className="text-xl font-semibold text-white">Remove {plugin.name}?</h2><p className="mt-3 text-sm leading-6 text-slate-400">Its behavior hooks will stop applying to this project. Existing OlivERP records will not be deleted.</p><div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button><button type="button" disabled={busy} onClick={onConfirm} className="rounded-xl bg-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50">{busy ? "Removing…" : "Remove"}</button></div></div></div>; }
function PluginMark({ enabled }: { enabled: boolean }) { return <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${enabled ? "border-primary-400/20 bg-primary-500/15 text-primary-300" : "border-white/5 bg-white/[0.03] text-slate-600"}`}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 3v4.5H4M15.5 3v4.5H20M8.5 21v-4.5H4M15.5 21v-4.5H20"/><rect x="7.5" y="7.5" width="9" height="9" rx="2"/></svg></div>; }
function LockIcon({ className }: { className?: string }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>; }
function ArrowIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>; }
function EmptyState({ title, detail }: { title: string; detail: string }) { return <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.015] px-6 py-12 text-center"><div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.03] text-slate-600"><LockIcon className="h-4 w-4" /></div><p className="font-medium text-slate-300">{title}</p><p className="mt-1 text-sm text-slate-600">{detail}</p></div>; }
function PluginSkeleton() { return <div className="h-64 animate-pulse rounded-3xl bg-white/[0.035]" />; }
