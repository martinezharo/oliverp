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
    <>
      <button
        type="button"
        aria-label={t(copied ? "settings.keys.copied" : "settings.keys.copy")}
        title={t(copied ? "settings.keys.copied" : "settings.keys.copy")}
        onClick={() => {
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          });
        }}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-emerald-400/80 transition-colors hover:bg-emerald-400/10 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
      >
        {copied ? (
          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 4 4L19 6" />
          </svg>
        ) : (
          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" />
            <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
          </svg>
        )}
      </button>
      <span className="sr-only" aria-live="polite">{copied ? t("settings.keys.copied") : ""}</span>
    </>
  );
}

function MintedKeyValue({ value }: { value: string }) {
  const { t } = useT();
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="mt-3 flex min-w-0 items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center rounded-lg bg-black/40 p-1 pl-3 ring-1 ring-inset ring-white/[0.04] focus-within:ring-emerald-400/30">
        <code className="min-w-0 flex-1 select-all overflow-x-auto whitespace-nowrap font-mono text-xs text-emerald-100">
          {revealed ? value : "erp_sk_••••••••••••••••"}
        </code>
        <button
          type="button"
          aria-label={t(revealed ? "settings.keys.hide" : "settings.keys.show")}
          aria-pressed={revealed}
          title={t(revealed ? "settings.keys.hide" : "settings.keys.show")}
          onClick={() => setRevealed((current) => !current)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-emerald-300 transition-colors hover:bg-emerald-400/10 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
        >
          {revealed ? (
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="h-[1.125rem] w-[1.125rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m2 2 20 20" />
              <path d="M6.71 6.71C4.7 8.1 3.24 9.9 2 12c2.1 3.56 5.63 6 10 6 1.4 0 2.69-.25 3.86-.7" />
              <path d="M10.73 5.08A10.7 10.7 0 0 1 12 5c4.37 0 7.9 2.44 10 7a13.5 13.5 0 0 1-2.04 2.88" />
              <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
            </svg>
          ) : (
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="h-[1.125rem] w-[1.125rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.6 7.9 7.26 5 12 5c4.74 0 8.4 2.9 9.94 6.65a1 1 0 0 1 0 .7C20.4 16.1 16.74 19 12 19c-4.74 0-8.4-2.9-9.94-6.65" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      <CopyButton value={value} />
    </div>
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
            <MintedKeyValue key={minted.key} value={minted.key} />
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
