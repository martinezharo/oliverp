"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { ui } from "@/i18n/ui";
import { useCloudSession } from "@/hooks/useCloudSession";

import ProjectSelector from "./ProjectSelector";
import Sidebar from "./Sidebar";

type Project = { id: number; nombre: string; activo?: boolean };

const t = (key: string) => ui.en[key] ?? key;

export default function AppLayout({
  title,
  currentPath,
  projects,
  projectId,
  demo,
  onNewProject,
  children,
}: {
  title: string;
  currentPath: string;
  projects: Project[];
  projectId: number | null;
  demo: boolean;
  // Absent on the login screen, where no project selector is rendered.
  onNewProject?: () => void;
  children: ReactNode;
}) {
  const session = useCloudSession();
  const mainRef = useRef<HTMLElement>(null);
  const search = projectId ? `?projectId=${projectId}` : "";
  const userAvailable = demo || Boolean(session.user);

  // The shell intentionally survives route changes, so its scrolling element
  // survives too. Reset it explicitly or a document opened from a lower card
  // starts half-way down the next page.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [currentPath]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPath={currentPath} search={search} />

      <div className="relative ml-0 flex min-w-0 flex-1 flex-col transition-all duration-300 lg:ml-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/5 bg-[#0f1016]/80 px-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <h2 className="hidden text-xs font-bold uppercase tracking-widest text-slate-500 md:block">
              {title.split("|")[1]?.trim() || t("layout.dashboard")}
            </h2>
          </div>

          <div className="flex items-center gap-6">
            {userAvailable && (
              <div className="w-40 md:w-64">
                <ProjectSelector projects={projects} currentProjectId={projectId} currentPath={currentPath} onNewProject={onNewProject ?? (() => {})} />
              </div>
            )}

            {userAvailable && demo && (
              // API redirects must be native navigations so the Worker can set/delete its cookie.
              // eslint-disable-next-line @next/next/no-html-link-for-pages
              <a href="/api/demo/exit" className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs font-medium text-amber-200 transition-colors hover:border-amber-300/40 hover:bg-amber-400/10">
                {t("demo.exit")}
              </a>
            )}

            {userAvailable && !demo && (
              <button type="button" onClick={() => void session.signOut()} className="group relative flex h-10 w-10 items-center justify-center rounded-full bg-white/5 transition-colors hover:bg-red-500/20" title={t("layout.signOut")}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 group-hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>
        </header>

        <main ref={mainRef} className="flex-1 overflow-y-auto scroll-smooth p-6 pb-20 lg:pb-6">
          <div className="mx-auto max-w-7xl pb-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
