"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { useRef, useState } from "react";

import Badge from "@/components/ui/Badge";
import Modal, { useDialogOpen } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { primaryButton } from "@/components/ui/button";
import { fieldLabel, input } from "@/components/ui/form";
import { apiErrorMessage, apiJson } from "@/lib/client-api";
import { mockApiKeys } from "@/lib/mock-data";
import { useT } from "@/i18n/LocaleProvider";
import type { ApiKeyRow } from "@/types/erp";

/** A key is only ever shown once, right after it is minted. */
type MintedKey = { nombre: string; key: string };

const keyIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15.5 7.5 3 3L22 7l-3-3" />
    <path d="m21 2-9.6 9.6" />
    <circle cx="7.5" cy="15.5" r="5.5" />
  </svg>
);

const day: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };

/**
 * The query usually answers in well under the time it takes to notice, so the
 * placeholder is held back until it would actually be informative: on a fast
 * answer it never paints at all and the list simply fades in, instead of the
 * blink of a placeholder being swapped for text of the same size.
 */
const holdBack = "animate-[fade-in_0.2s_ease-out_0.35s_both]";
const settle = "animate-[fade-in_0.2s_ease-out]";

function CopyButton({ value }: { value: string }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="shrink-0 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200 transition-all hover:border-emerald-400/60 hover:bg-emerald-500/20"
    >
      {copied ? t("settings.keys.copied") : t("settings.keys.copy")}
    </button>
  );
}

/**
 * The meta line under a key, styled like the project rows it sits next to:
 * dot-separated facts, with an expired key called out in amber.
 */
function KeyMeta({ row, now }: { row: ApiKeyRow; now: number }) {
  const { t, formatDate } = useT();
  const expired = row.expira_en !== null && new Date(row.expira_en).getTime() < now;

  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
      <span>{t("settings.keys.created", { date: formatDate(row.creada_en, day) })}</span>
      <span aria-hidden="true" className="text-slate-700">·</span>
      <span>
        {row.ultimo_uso_en
          ? t("settings.keys.lastUsed", { date: formatDate(row.ultimo_uso_en, day) })
          : t("settings.keys.neverUsed")}
      </span>
      <span aria-hidden="true" className="text-slate-700">·</span>
      <span className={expired ? "text-amber-400/90" : undefined}>
        {row.expira_en === null
          ? t("settings.keys.expiresNever")
          : t(expired ? "settings.keys.expired" : "settings.keys.expiresOn", {
              date: formatDate(row.expira_en, day),
            })}
      </span>
    </p>
  );
}

/**
 * Key management for one project.
 *
 * The list is read straight from Convex, so a key appears the moment it is
 * minted and disappears the moment it is revoked without this component
 * keeping its own copy of the table. The only state it owns is the plaintext
 * of a key just created, which exists nowhere else.
 */
export default function ApiKeysModal({
  projectId,
  projectName,
  demo,
  onClose,
}: {
  projectId: number;
  projectName: string;
  demo: boolean;
  onClose: () => void;
}) {
  const { t } = useT();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  useDialogOpen(true, dialogRef, onClose);

  // Demo mode renders the same screen against a sample key, with every control
  // inert — the chrome is the point, and there is no backend behind it.
  const remote = useQuery(api.apiKeys.list, demo ? "skip" : { projectLegacyId: projectId });
  const keys = demo ? mockApiKeys : (remote as ApiKeyRow[] | null | undefined);

  // Expiry is judged against the moment the modal opened, so a re-render never
  // reclassifies a row mid-session and rendering stays pure.
  const [openedAt] = useState(() => Date.now());

  const [name, setName] = useState("");
  const [scope, setScope] = useState<"read" | "write">("read");
  const [expiresAt, setExpiresAt] = useState("");
  const [minted, setMinted] = useState<MintedKey | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const response = await apiJson<{ data: { key: string; nombre: string } }>(
        "/api/keys/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            name: name.trim(),
            scopes: scope === "write" ? ["read", "write"] : ["read"],
            ...(expiresAt ? { expiresAt } : {}),
          }),
        },
      );
      setMinted({ nombre: response.data.nombre, key: response.data.key });
      setName("");
      setExpiresAt("");
      setScope("read");
    } catch (cause) {
      setError(apiErrorMessage(t, cause, t("settings.keys.createError")));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setConfirming(null);
    setRevoking(id);
    setError(null);
    try {
      await apiJson("/api/keys/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId: id }),
      });
    } catch (cause) {
      setError(apiErrorMessage(t, cause, t("settings.keys.revokeError")));
    } finally {
      setRevoking(null);
    }
  }

  return (
    <Modal
      dialogRef={dialogRef}
      maxWidth="max-w-2xl"
      title={t("settings.keys.title")}
      subtitle={t("settings.keys.subtitle", { name: projectName })}
      icon={keyIcon}
      onClose={onClose}
      dismissible={!busy}
      scrollable
    >
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
        {minted && (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.07] p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {t("settings.keys.newTitle")}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="min-w-0 flex-1 select-all overflow-x-auto rounded-lg bg-black/40 px-3 py-2 font-mono text-xs text-emerald-100">
                {minted.key}
              </code>
              <CopyButton value={minted.key} />
            </div>
            <p className="mt-2 text-xs text-emerald-300/70">{t("settings.keys.newHint")}</p>
          </div>
        )}

        {/* The floor is the height of the empty note, which the skeleton
            reproduces box for box: loading, "no keys yet" and a single row all
            settle at the same size, so the frame no longer jumps the instant
            the query resolves. */}
        <div className="min-h-[6.625rem]">
          {keys === undefined ? (
            <div className={`rounded-2xl border border-dashed border-white/10 px-4 py-8 ${holdBack}`} aria-busy="true">
              <div className="mx-auto h-5 w-64 max-w-full rounded bg-white/5" />
              <div className="mx-auto mt-1 h-4 w-72 max-w-full rounded bg-white/[0.03]" />
            </div>
          ) : keys === null ? (
            <p className={`rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-500 ${settle}`}>
              {t("settings.keys.forbidden")}
            </p>
          ) : keys.length === 0 ? (
            <div className={`rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center ${settle}`}>
              <p className="text-sm text-slate-400">{t("settings.keys.empty")}</p>
              <p className="mt-1 text-xs text-slate-600">{t("settings.keys.emptyHint")}</p>
            </div>
          ) : (
            <ul className={`divide-y divide-white/5 border-y border-white/5 ${settle}`}>
              {keys.map((row) => (
                <li key={row.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium text-white">{row.nombre}</span>
                      <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-slate-400">
                        {row.prefijo}…
                      </code>
                      <Badge>
                        {t(`settings.keys.scopes.${row.scopes.includes("write") ? "write" : "read"}`)}
                      </Badge>
                    </div>
                    <KeyMeta row={row} now={openedAt} />
                  </div>

                  {revoking === row.id ? (
                    <span className="flex shrink-0 items-center gap-2 self-start text-xs text-slate-400 sm:self-auto">
                      <Spinner />
                      {t("settings.keys.revoking")}
                    </span>
                  ) : confirming === row.id ? (
                    // Revocation is confirmed in place rather than behind another
                    // dialog: it destroys a credential, not accounting data, and
                    // a second modal on top of this one would be heavier than the
                    // act deserves.
                    <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
                      <span className="text-xs text-slate-400">{t("settings.keys.revokeConfirm")}</span>
                      <button
                        type="button"
                        onClick={() => void revoke(row.id)}
                        className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-red-600"
                      >
                        {t("settings.keys.revoke")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(null)}
                        className="rounded-lg px-2 py-1.5 text-xs text-slate-400 transition-all hover:bg-white/5 hover:text-white"
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={demo || revoking !== null}
                      onClick={() => setConfirming(row.id)}
                      className="shrink-0 self-start rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-300 transition-all hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto"
                    >
                      {t("settings.keys.revoke")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        {keys !== null && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim() && !busy) void create();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="api-key-name" className={fieldLabel}>
                  {t("settings.keys.nameLabel")}
                </label>
                <input
                  id="api-key-name"
                  type="text"
                  value={name}
                  maxLength={60}
                  autoComplete="off"
                  placeholder={t("settings.keys.namePlaceholder")}
                  onChange={(event) => setName(event.target.value)}
                  disabled={demo || busy}
                  className={`${input} mt-2 placeholder:text-slate-600 focus:border-primary-500`}
                />
              </div>

              <div>
                <label htmlFor="api-key-scope" className={fieldLabel}>
                  {t("settings.keys.scopesLabel")}
                </label>
                <select
                  id="api-key-scope"
                  value={scope}
                  onChange={(event) => setScope(event.target.value as "read" | "write")}
                  disabled={demo || busy}
                  className={`${input} mt-2 focus:border-primary-500`}
                >
                  <option value="read">{t("settings.keys.scopes.read")}</option>
                  <option value="write">{t("settings.keys.scopes.write")}</option>
                </select>
              </div>

              <div>
                <label htmlFor="api-key-expires" className={fieldLabel}>
                  {t("settings.keys.expiresLabel")}
                </label>
                <input
                  id="api-key-expires"
                  type="date"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  disabled={demo || busy}
                  className={`${input} mt-2 focus:border-primary-500`}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              {demo && (
                <p className="mr-auto text-xs text-amber-400/80">{t("settings.keys.demoNotice")}</p>
              )}
              <button
                type="submit"
                disabled={demo || !name.trim() || busy}
                className={`${primaryButton} flex items-center gap-2`}
              >
                {busy ? (
                  <Spinner />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                )}
                {busy ? t("settings.keys.creating") : t("settings.keys.create")}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
