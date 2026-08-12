"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import ConfirmDeleteModal from "@/components/ui/ConfirmDeleteModal";
import { apiErrorMessage, apiJson } from "@/lib/client-api";
import { useCloudSession } from "@/hooks/useCloudSession";
import { useErpContext } from "@/hooks/useErpContext";
import { plural, t } from "@/i18n/t";

type ProjectRow = {
  id: number;
  nombre: string;
  rol: "admin" | "miembro";
  miembros: number;
  api_keys: number;
};

/** Demo mode shows the real chrome with the destructive paths disabled. */
const demoProjects: ProjectRow[] = [
  { id: 1, nombre: "Demo project", rol: "admin", miembros: 1, api_keys: 0 },
];

type Pending = { kind: "project"; project: ProjectRow } | { kind: "account" };

export default function SettingsPage() {
  const { demo } = useErpContext();
  const session = useCloudSession();
  const router = useRouter();

  const remote = useQuery(api.account.summary, demo || !session.user ? "skip" : {});
  const projects = demo ? demoProjects : (remote?.proyectos as ProjectRow[] | undefined);

  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(next: Pending) {
    setError(null);
    setPending(next);
  }

  async function confirm() {
    if (!pending || demo) return;
    setBusy(true);
    setError(null);
    try {
      if (pending.kind === "project") {
        await apiJson("/api/projects/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: pending.project.id }),
        });
        setPending(null);
        // The project selector and every list read from Convex, which pushes
        // the removal to them; the route is replaced so a deleted project id
        // does not stay in the URL.
        router.replace("/ajustes");
      } else {
        await apiJson("/api/account/delete", { method: "POST" });
        // The account is gone: end the session before anything can re-query.
        await session.signOut();
        router.replace("/login");
      }
    } catch (cause) {
      setError(apiErrorMessage(cause, t("settings.deleteError")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
          {t("settings.heading")}
        </h1>
        <p className="mt-2 text-sm text-slate-400">{t("settings.subtitle")}</p>
      </header>

      <section className="overflow-hidden rounded-3xl border border-white/5 bg-[#14151a]/50 backdrop-blur-xl">
        <div className="border-b border-white/5 px-6 py-5">
          <h2 className="text-lg font-semibold text-white">{t("settings.projects.title")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("settings.projects.description")}</p>
        </div>

        {projects === undefined ? (
          <div className="animate-pulse space-y-px" aria-busy="true">
            <div className="h-20 bg-white/5" />
            <div className="h-20 bg-white/[0.03]" />
          </div>
        ) : projects.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500">
            {t("settings.projects.empty")}
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {projects.map((project) => (
              <li
                key={project.id}
                className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="truncate font-medium text-white">{project.nombre}</span>
                    <span className="shrink-0 rounded-full border border-primary-500/20 bg-primary-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-400">
                      {t(`settings.projects.role.${project.rol}`)}
                    </span>
                  </div>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>{plural("settings.projects.members", project.miembros)}</span>
                    <span aria-hidden="true" className="text-slate-700">·</span>
                    <span>{plural("settings.projects.keys", project.api_keys)}</span>
                  </p>
                </div>

                <button
                  type="button"
                  disabled={demo || project.rol !== "admin"}
                  onClick={() => open({ kind: "project", project })}
                  className="shrink-0 self-start rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm font-medium text-red-300 transition-all hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-red-500/20 disabled:hover:bg-red-500/5 sm:self-auto"
                >
                  {t("settings.projects.delete")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-red-500/20 bg-red-500/[0.03] backdrop-blur-xl">
        <div className="border-b border-red-500/10 px-6 py-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-red-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
            {t("settings.danger.title")}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{t("settings.danger.description")}</p>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-white">{t("settings.account.delete")}</p>
            <p className="mt-1 text-xs text-slate-500">{t("settings.account.deleteHint")}</p>
          </div>
          <button
            type="button"
            disabled={demo}
            onClick={() => open({ kind: "account" })}
            className="shrink-0 self-start rounded-lg bg-red-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none sm:self-auto"
          >
            {t("settings.account.delete")}
          </button>
        </div>

        {demo && (
          <p className="border-t border-red-500/10 px-6 py-3 text-xs text-amber-400/80">
            {t("settings.demoNotice")}
          </p>
        )}
      </section>

      {pending?.kind === "project" && (
        <ConfirmDeleteModal
          title={t("settings.deleteProject.title")}
          warningHtml={t("settings.deleteProject.warning", { name: pending.project.nombre })}
          confirmLabel={t("settings.deleteProject.confirmLabel")}
          confirmValue={pending.project.nombre}
          actionLabel={t("settings.projects.delete")}
          busy={busy}
          error={error}
          onConfirm={() => void confirm()}
          onClose={() => setPending(null)}
        />
      )}

      {pending?.kind === "account" && (
        <ConfirmDeleteModal
          title={t("settings.deleteAccount.title")}
          warningHtml={plural("settings.deleteAccount.warning", projects?.length ?? 0)}
          confirmLabel={t("settings.deleteAccount.confirmLabel")}
          confirmValue={t("settings.deleteAccount.confirmWord")}
          actionLabel={t("settings.account.delete")}
          busy={busy}
          error={error}
          onConfirm={() => void confirm()}
          onClose={() => setPending(null)}
        />
      )}
    </div>
  );
}
