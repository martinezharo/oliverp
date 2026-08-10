"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AppLayout from "@/components/legacy/AppLayout";
import Dashboard from "@/components/legacy/Dashboard";
import HistoryPage from "@/components/legacy/HistoryPage";
import OperationModals from "@/components/legacy/OperationModals";
import ProjectModal from "@/components/legacy/ProjectModal";
import StockPage from "@/components/legacy/StockPage";
import TransactionsPage from "@/components/legacy/TransactionsPage";
import { useCloudSession } from "@/hooks/useCloudSession";
import { ui } from "@/i18n/ui";
import { ApiRequestError, apiErrorMessage, apiJson } from "@/lib/client-api";
import { mockProjects } from "@/lib/mock-data";

type Project = { id: number; nombre: string; activo?: boolean };
type View = "dashboard" | "stock" | "transactions" | "history";
type ModalKind = "sale" | "purchase" | "other" | "product" | null;

const t = (key: string) => ui.en[key] ?? key;

export default function ErpApp({ view }: { view: View }) {
  const session = useCloudSession();
  const router = useRouter();
  const [demo, setDemo] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);
  const [projectModal, setProjectModal] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const isDemo = await apiJson<{ active: boolean }>("/api/demo/status").then((body) => body.active).catch(() => false);
      if (cancelled) return;
      setDemo(isDemo);
      if (!session.ready) return;
      if (!isDemo && !session.user) {
        router.replace("/login");
        return;
      }
      try {
        const nextProjects = isDemo ? mockProjects : (await apiJson<{ data: Project[] }>("/api/v1/proyectos")).data;
        if (cancelled) return;
        const available = nextProjects ?? [];
        setProjects(available);
        const rawProjectId = new URLSearchParams(window.location.search).get("projectId");
        const requested = rawProjectId ? Number(rawProjectId) : null;
        setProjectId(requested && available.some((project) => project.id === requested) ? requested : available[0]?.id ?? null);
      } catch (cause) {
        if (cancelled) return;
        // The error code is authoritative; matching on the message text broke
        // as soon as the API answered in a different language.
        const expired = cause instanceof ApiRequestError && (cause.status === 401 || cause.code === "unauthorized");
        if (expired) router.replace("/login");
        else setError(apiErrorMessage(cause, t("common.errorLoadingData")));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reloadKey, router, session.ready, session.user]);

  if (loading || !session.ready) return <LoadingScreen />;
  if (!demo && !session.user) return <LoadingScreen />;

  // Without a project the app has nothing to show, so the creation dialog is
  // opened on every visit until one exists.
  const mustCreateProject = !demo && !error && projects.length === 0;

  function projectCreated(project: Project) {
    setProjects((current) => [...current, project]);
    setProjectId(project.id);
    setProjectModal(false);
    router.replace(`${pathFor(view)}?projectId=${project.id}`);
  }

  return <AppLayout title={titleFor(view)} currentPath={pathFor(view)} projects={projects} projectId={projectId} demo={demo} onNewProject={() => { if (!demo) setProjectModal(true); }}>
    {error && <ErrorBanner message={error} />}
    {demo && <DemoBanner full={view === "dashboard"} />}
    {view === "dashboard" && projectId && <Dashboard projectId={projectId} demo={demo} reloadKey={reloadKey} onOpenModal={setModal} />}
    {view === "stock" && projectId && <StockPage projectId={projectId} demo={demo} reloadKey={reloadKey} onNewProduct={() => setModal("product")} />}
    {view === "transactions" && projectId && <TransactionsPage projectId={projectId} demo={demo} reloadKey={reloadKey} onOpenModal={setModal} />}
    {view === "history" && projectId && <HistoryPage projectId={projectId} demo={demo} reloadKey={reloadKey} />}
    {!projectId && <EmptyState text={t("project.none")} />}
    <OperationModals key={`${modal ?? "closed"}-${projectId ?? "none"}`} kind={modal} projectId={projectId} demo={demo} onClose={() => setModal(null)} onSaved={() => { setModal(null); setReloadKey((value) => value + 1); }} />
    {(projectModal || mustCreateProject) && <ProjectModal mandatory={mustCreateProject} demo={demo} onClose={() => setProjectModal(false)} onCreated={projectCreated} />}
  </AppLayout>;
}

function pathFor(view: View): string { return view === "dashboard" ? "/" : view === "transactions" ? "/transacciones" : view === "history" ? "/historial" : "/stock"; }
function titleFor(view: View): string { return t(`title.${view}`); }

function DemoBanner({ full }: { full: boolean }) {
  return <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span><strong>{t("demo.title")}</strong> — {full ? t("demo.full") : t("demo.short")}</span></div>;
}

function LoadingScreen() { return <main className="flex min-h-screen items-center justify-center bg-[#0f1016] text-sm text-slate-400">{t("common.loading")}</main>; }
function ErrorBanner({ message }: { message: string }) { return <div role="alert" className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">{message}</div>; }
function EmptyState({ text }: { text: string }) { return <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-12 text-center italic text-slate-500">{text}</div>; }
