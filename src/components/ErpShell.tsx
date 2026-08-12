"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import AppLayout from "@/components/layout/AppLayout";
import OperationModals from "@/components/operations/OperationModals";
import ProjectModal from "@/components/projects/ProjectModal";
import { ErpContext, type ModalKind, type ModalRequest, type Project } from "@/hooks/useErpContext";
import { useCloudSession } from "@/hooks/useCloudSession";
import { t } from "@/i18n/t";
import { mockProjects } from "@/lib/mock-data";

const titles: Record<string, string> = {
  "/": "title.dashboard",
  "/stock": "title.stock",
  "/transacciones": "title.transactions",
  "/historial": "title.history",
  "/plugins": "title.plugins",
  "/ajustes": "title.settings",
  "/documentacion": "title.documentation",
};

/**
 * The persistent application shell.
 *
 * It renders from the `(erp)` layout, so React keeps it mounted across every
 * route in the group: the sidebar, the header and the project list survive a
 * navigation instead of being torn down and rebuilt. Only `children` — the
 * page itself — changes.
 */
export default function ErpShell({ demo, children }: { demo: boolean; children: React.ReactNode }) {
  const session = useCloudSession();
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const [modal, setModal] = useState<ModalRequest | null>(null);
  const [projectModal, setProjectModal] = useState(false);

  const authenticated = Boolean(session.user);
  // Convex answers over the socket that is already open and caches the result,
  // so returning to a page repaints from memory rather than refetching.
  const remoteProjects = useQuery(api.session.projects, !demo && authenticated ? {} : "skip");
  const projects: Project[] = useMemo(
    () => (demo ? mockProjects : remoteProjects ?? []),
    [demo, remoteProjects],
  );
  const ready = demo || (session.ready && (!authenticated || remoteProjects !== undefined));

  const requested = Number(searchParams?.get("projectId"));
  const projectId = useMemo(() => {
    const valid = Number.isInteger(requested) && projects.some((project) => project.id === requested);
    return valid ? requested : projects[0]?.id ?? null;
  }, [projects, requested]);
  // Signed out and not in demo: the app has nothing to render. The decision is
  // taken from the token (`authKnown`), which resolves before the profile
  // query, so the redirect fires as early as possible.
  const signedOut = !demo && ((session.authKnown && !session.authenticated) || (session.ready && !authenticated));
  useEffect(() => {
    if (signedOut) router.replace("/login");
  }, [router, signedOut]);

  // Without a project the app has nothing to show, so the creation dialog is
  // opened on every visit until one exists.
  const mustCreateProject = !demo && ready && authenticated && projects.length === 0;

  function projectCreated(project: Project) {
    setProjectModal(false);
    router.replace(`${pathname}?projectId=${project.id}`);
  }

  function openModal(kind: Exclude<ModalKind, null>, id?: number) {
    setModal({ kind, ...(id === undefined ? {} : { id }) });
  }

  const context = { projectId, projects, demo, ready, openModal };

  // While the redirect above is in flight the visitor gets a bare background
  // rather than a glimpse of the application. The common case never gets here:
  // the middleware already turned the request away before it was rendered.
  if (signedOut) return <div className="min-h-screen bg-[#0f1016]" />;

  return (
    <ErpContext.Provider value={context}>
      <AppLayout
        title={t(titles[pathname] ?? (pathname.startsWith("/plugins/") ? "title.plugins" : pathname.startsWith("/documentacion/") ? "title.documentation" : "title.dashboard"))}
        currentPath={pathname}
        projects={projects}
        projectId={projectId}
        demo={demo}
        onNewProject={() => { if (!demo) setProjectModal(true); }}
      >
        {demo && <DemoBanner full={pathname === "/"} />}
        {/* The chrome is never blanked: only the content area waits. */}
        {ready ? children : <ShellSkeleton />}
      </AppLayout>

      <OperationModals
        key={`${modal?.kind ?? "closed"}-${modal?.id ?? "new"}-${projectId ?? "none"}`}
        kind={modal?.kind ?? null}
        transactionId={modal?.id ?? null}
        projectId={projectId}
        demo={demo}
        onClose={() => setModal(null)}
        // Convex pushes the new rows to every open subscription, so a saved
        // operation no longer needs the views to be told to refetch.
        onSaved={() => setModal(null)}
      />
      {(projectModal || mustCreateProject) && (
        <ProjectModal
          mandatory={mustCreateProject}
          demo={demo}
          onClose={() => setProjectModal(false)}
          onCreated={projectCreated}
        />
      )}
    </ErpContext.Provider>
  );
}

function ShellSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label={t("common.loading")}>
      <div className="h-10 w-64 rounded-xl bg-white/5" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="h-48 rounded-3xl bg-white/5" />
        <div className="h-48 rounded-3xl bg-white/5" />
        <div className="h-48 rounded-3xl bg-white/5" />
      </div>
      <div className="h-72 rounded-3xl bg-white/5" />
    </div>
  );
}

function DemoBanner({ full }: { full: boolean }) {
  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span><strong>{t("demo.title")}</strong> — {full ? t("demo.full") : t("demo.short")}</span>
    </div>
  );
}
