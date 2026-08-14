"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import ApiKeysModal from "@/components/settings/ApiKeysModal";
import { InstallApp } from "@/components/settings/InstallApp";
import { Row, Section } from "@/components/settings/rows";
import Badge from "@/components/ui/Badge";
import ConfirmDeleteModal from "@/components/ui/ConfirmDeleteModal";
import { dangerButton, dangerSolidButton, secondaryButton } from "@/components/ui/button";
import { apiErrorMessage, apiJson } from "@/lib/client-api";
import { useCloudSession } from "@/hooks/useCloudSession";
import { useErpContext } from "@/hooks/useErpContext";
import { plural, t } from "@/i18n/t";
import { appPath } from "@/lib/navigation";

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

/** The account actions line up in one column, so they share a width. */
const accountButton = "sm:min-w-40";

export default function SettingsPage() {
  const { demo } = useErpContext();
  const session = useCloudSession();
  const router = useRouter();

  const remote = useQuery(api.account.summary, demo || !session.user ? "skip" : {});
  const projects = demo ? demoProjects : (remote?.proyectos as ProjectRow[] | undefined);

  const [pending, setPending] = useState<Pending | null>(null);
  /** The project whose API keys are open, or null while the modal is closed. */
  const [managing, setManaging] = useState<ProjectRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    if (demo || signingOut) return;
    setSigningOut(true);
    try {
      await session.signOut();
      router.replace("/login");
    } finally {
      setSigningOut(false);
    }
  }

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
        router.replace(appPath("ajustes"));
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
    // Settings is a column of rows, not a dashboard: capping the width keeps a
    // label and its button from ending up at opposite edges of a wide screen,
    // and centring it keeps the empty space balanced instead of piling it all
    // up on the right.
    <div className="mx-auto max-w-3xl space-y-10">
      <header>
        <h1 className="bg-linear-to-r from-white to-slate-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
          {t("settings.heading")}
        </h1>
        <p className="mt-2 text-sm text-slate-400">{t("settings.subtitle")}</p>
      </header>

      <Section title={t("settings.projects.title")}>
        {projects === undefined ? (
          <li className="animate-pulse space-y-3 py-4" aria-busy="true">
            <div className="h-5 w-48 rounded bg-white/5" />
            <div className="h-3 w-64 rounded bg-white/[0.03]" />
          </li>
        ) : projects.length === 0 ? (
          <li className="py-8 text-center text-sm text-slate-500">
            {t("settings.projects.empty")}
          </li>
        ) : (
          projects.map((project) => (
            <Row
              key={project.id}
              title={project.nombre}
              badge={<Badge>{t(`settings.projects.role.${project.rol}`)}</Badge>}
              meta={
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>{plural("settings.projects.members", project.miembros)}</span>
                  <span aria-hidden="true" className="text-slate-700">·</span>
                  <span>{plural("settings.projects.keys", project.api_keys)}</span>
                </span>
              }
            >
              {/* Management first, destruction last: the red button stays at
                  the edge of the row so nothing lands on it by accident. */}
              <button
                type="button"
                disabled={project.rol !== "admin"}
                onClick={() => setManaging(project)}
                className={secondaryButton}
              >
                {t("settings.keys.manage")}
              </button>
              <button
                type="button"
                disabled={demo || project.rol !== "admin"}
                onClick={() => open({ kind: "project", project })}
                className={dangerButton}
              >
                {t("settings.projects.delete")}
              </button>
            </Row>
          ))
        )}
      </Section>

      {/* Between the projects and the account: it is about this device, not
          about the data or the session. Demo mode is not excluded — trying the
          product as an application is part of trying it. */}
      <InstallApp />

      <Section title={t("settings.account.title")}>
        {/* The email is the row: labelling it "Session" and then repeating
            "Sign out" as the title next to a button that already says it was
            three ways of saying the same thing. */}
        <Row title={session.user?.email ?? t("settings.session.title")}>
          <button
            type="button"
            disabled={demo || signingOut}
            onClick={() => void signOut()}
            className={`${secondaryButton} ${accountButton}`}
          >
            {signingOut ? t("settings.session.signingOut") : t("layout.signOut")}
          </button>
        </Row>

        <Row title={t("settings.account.delete")}>
          <button
            type="button"
            disabled={demo}
            onClick={() => open({ kind: "account" })}
            className={`${dangerSolidButton} ${accountButton}`}
          >
            {t("settings.deleteAccount.title")}
          </button>
        </Row>
      </Section>

      {demo && <p className="text-xs text-amber-400/80">{t("settings.demoNotice")}</p>}

      {managing && (
        <ApiKeysModal
          projectId={managing.id}
          projectName={managing.nombre}
          demo={demo}
          onClose={() => setManaging(null)}
        />
      )}

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
