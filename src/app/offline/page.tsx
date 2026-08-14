import type { Metadata } from "next";

import { LogoMark } from "@/components/ui/Logo";
import { t } from "@/i18n/t";
import { APP_ROOT } from "@/lib/navigation";

export const metadata: Metadata = { title: t("offline.title") };

/**
 * What the installed application shows when there is no network.
 *
 * The service worker precaches exactly this page, so it has to render from
 * nothing: no session, no Convex, no data. It is a public route for the same
 * reason — the worker fetches it once, up front, and a redirect to the login
 * screen is what it would otherwise have stored under this URL.
 *
 * There is no reload button that calls `location.reload()`, because a link the
 * worker will retry over the network does the same thing and still works when
 * scripting is the thing that failed.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f1016] p-6">
      <div className="w-full max-w-sm text-center">
        <LogoMark className="mx-auto" />
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-white">{t("offline.heading")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{t("offline.description")}</p>
        <a
          href={APP_ROOT}
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-linear-to-r from-primary-500 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary-500/20 transition-transform hover:scale-[1.02]"
        >
          {t("offline.retry")}
        </a>
      </div>
    </main>
  );
}
