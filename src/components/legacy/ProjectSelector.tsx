"use client";

import Link from "next/link";

import { ui } from "@/i18n/ui";
import { getProjectNameKey } from "@/lib/mock-data";

type Project = { id: number; nombre: string; activo?: boolean };

const t = (key: string) => ui.en[key] ?? key;

export default function ProjectSelector({
  projects,
  currentProjectId,
  currentPath,
  onNewProject,
}: {
  projects: Project[];
  currentProjectId: number | null;
  currentPath: string;
  onNewProject: () => void;
}) {
  const activeProject = projects.find((project) => project.id === currentProjectId) ?? projects[0];
  const projectUrl = (id: number) => `${currentPath}?projectId=${id}`;

  return (
    <div className="group relative">
      <button
        id="project-selector-btn"
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
      >
        <span className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-primary-400 to-primary-600 text-xs font-bold text-white shadow-lg shadow-primary-500/20">
            {activeProject?.nombre.substring(0, 1).toUpperCase() || "P"}
          </span>
          <span className="max-w-[120px] truncate">
            {t(getProjectNameKey(activeProject?.nombre || "")) || t("project.select")}
          </span>
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-slate-400 transition-transform group-hover:rotate-180 group-hover:text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className="invisible absolute left-0 top-full z-50 mt-2 w-56 origin-top scale-95 rounded-xl border border-white/10 bg-[#0f1016] p-1 opacity-0 shadow-xl backdrop-blur-xl transition-all duration-200 group-hover:visible group-hover:scale-100 group-hover:opacity-100">
        <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{t("project.mine")}</div>
        <div className="space-y-0.5">
          {projects.map((project) => {
            const active = activeProject?.id === project.id;
            return (
              <Link
                key={project.id}
                href={projectUrl(project.id)}
                className={`group/item relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2 text-sm transition-all ${active ? "border border-primary-500/20 bg-primary-500/10 text-primary-400" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
              >
                {active && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-primary-500 shadow-[0_0_8px_rgba(var(--primary-500),0.5)]" />}
                <span className="relative z-10 w-full truncate">{t(getProjectNameKey(project.nombre))}</span>
                {active && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="ml-auto h-4 w-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </Link>
            );
          })}
          {projects.length === 0 && <div className="px-3 py-2 text-sm italic text-slate-500">{t("project.none")}</div>}
        </div>

        <div className="mx-2 my-1 h-px bg-white/5" />
        <button type="button" onClick={onNewProject} className="group/new flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white">
          <span className="flex h-5 w-5 items-center justify-center rounded-md border border-dashed border-slate-600 transition-colors group-hover/new:border-primary-500 group-hover/new:text-primary-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </span>
          <span>{t("project.new")}</span>
        </button>
      </div>
    </div>
  );
}
