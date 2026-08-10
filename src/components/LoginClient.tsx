"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useCloudSession } from "@/hooks/useCloudSession";
import { ui } from "@/i18n/ui";

const t = (key: string) => ui.en[key] ?? key;

export default function LoginClient() {
  const session = useCloudSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (session.authenticated) router.replace("/");
  }, [router, session.authenticated]);

  async function signIn() {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      if (!session.configured) throw new Error("Authentication is not configured.");
      await session.signIn();
    } catch {
      setBusy(false);
      setError(true);
    }
  }

  // The login screen deliberately skips AppLayout: no sidebar or header should
  // frame a screen where there is no session to navigate with.
  return <main className="flex min-h-screen items-center justify-center bg-[#0f1016] p-6">
      <div className="group relative w-full max-w-md overflow-hidden rounded-2xl border border-white/5 bg-[#14151a]/50 p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary-500/20 blur-3xl transition-all duration-500 group-hover:bg-primary-500/30" />
        <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl transition-all duration-500 group-hover:bg-purple-500/30" />
        <div className="relative z-10">
          <h1 className="mb-2 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-center text-3xl font-bold text-transparent">{t("login.welcome")}</h1>
          <p className="mb-8 text-center text-sm text-slate-400">{t("login.subtitle")}</p>
          {error && <p role="alert" className="mb-6 rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-3 text-center text-sm text-red-200">{t("login.githubError")}</p>}
          <button type="button" onClick={() => void signIn()} disabled={busy || !session.ready} className="flex w-full items-center justify-center gap-3 rounded-lg bg-gradient-to-r from-primary-500 to-indigo-600 px-4 py-3 font-bold text-white shadow-lg shadow-primary-500/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-primary-500/40 disabled:cursor-wait disabled:opacity-60"><svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .7a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.2.8-.5v-2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.7-1.3-1.7-1.1-.8.1-.8.1-.8 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0C15.9 5 17 5.3 17 5.3c.6 1.6.2 2.9.1 3.2.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.5 5.7.5.4.9 1.1.9 2.2v3.1c0 .3.2.6.8.5A11.5 11.5 0 0 0 12 .7Z" /></svg>{busy ? "Redirecting to GitHub…" : t("login.signInWithGitHub")}</button>
          <div className="mt-7 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-slate-600"><span className="h-px flex-1 bg-white/10" /><span>{t("login.demoDivider")}</span><span className="h-px flex-1 bg-white/10" /></div>
          {/* API redirects must be native navigations so the Worker can set its cookie. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/api/demo/start" className="mt-4 flex w-full items-center gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-left transition-all hover:border-amber-300/40 hover:bg-amber-400/10 focus:outline-none focus:ring-2 focus:ring-amber-300/40"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></svg></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-amber-100">{t("login.demoCta")}</span><span className="mt-0.5 block text-xs text-slate-500">{t("login.demoDescription")}</span></span><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg></a>
        </div>
      </div>
  </main>;
}
