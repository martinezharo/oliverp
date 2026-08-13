import type { Metadata } from "next";

import { AppPreview } from "@/components/landing/AppPreview";
import { CLAIMS, DEMO, GITHUB_HREF, GITHUB_REPO, HERO, MODULES } from "@/components/landing/content";
import { LandingNav } from "@/components/landing/LandingNav";
import { TONES } from "@/components/landing/tones";
import { CARD, DemoButton, DemoCta, EnterButton, GitHubMark, Label, LandingFooter } from "@/components/landing/ui";

export const metadata: Metadata = {
  title: "OlivERP | El ERP que no te pide ser contable",
  description:
    "ERP gratuito y de código abierto para negocios pequeños: registra ventas y compras, y el stock, el IVA y el balance se calculan solos.",
};

/**
 * Nothing here reads the request, but the root layout hands the Convex URL to
 * the client provider that wraps every route. Prerendering this page would
 * bake whatever URL the build environment had into the payload the browser
 * keeps while navigating on to the app. Same reason as `/login`.
 */
export const dynamic = "force-dynamic";

/**
 * The public landing page.
 *
 * Four blocks and nothing repeated: what it is, what it has, why it is worth
 * it, and a way in. It is a server component built from the same surfaces as
 * the application — see `components/landing/ui.tsx`.
 */
export default function Landing() {
  return (
    <div className="min-h-screen">
      <LandingNav />

      <main>
        <section className="relative overflow-hidden border-b border-white/5">
          <div className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-primary-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 left-0 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />

          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-36 lg:grid-cols-[1fr_1.05fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-widest text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {HERO.eyebrow}
              </span>

              <h1 className="mt-6 text-balance text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
                {HERO.title[0]}
                <span className="bg-linear-to-r from-primary-400 to-indigo-400 bg-clip-text text-transparent">{HERO.title[1]}</span>
                {HERO.title[2]}
              </h1>

              <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-400">{HERO.lede}</p>

              <div className="mt-9 flex flex-wrap gap-3">
                <EnterButton size="lg" />
                <DemoButton size="lg" />
              </div>

              <p className="mt-5 font-mono text-xs text-slate-600">{HERO.note}</p>
            </div>

            <div className="relative">
              <AppPreview compact />
            </div>
          </div>
        </section>

        <section id="modulos" className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-[300px_1fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Label tone="blue">Todo el negocio</Label>
            <h2 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-white">
              Seis módulos, todos incluidos
            </h2>
            <p className="mt-4 text-slate-400">
              Todo lo que ves está en la aplicación desde el primer día.
            </p>
            <EnterButton className="mt-8" />
          </div>

          {/* The rows carry their own padding and pull it back with a negative
              margin, so the surface that appears on hover has room around the
              text instead of hugging it. */}
          <div className="-mx-5 border-t border-white/5">
            {MODULES.map((module) => {
              const tone = TONES[module.tone];
              return (
                <article
                  key={module.title}
                  className="group flex gap-5 rounded-2xl border-b border-white/5 px-5 py-7 transition-all hover:bg-white/[0.02] hover:pl-7"
                >
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors ${tone.badge}`}>
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${tone.accent}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {module.icon}
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-white">{module.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{module.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-y border-white/5 bg-white/[0.015]">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-20 md:grid-cols-3">
            {CLAIMS.map((claim) => (
              <div key={claim.title} className="border-t border-white/10 pt-6">
                <span className={`mb-4 block h-2 w-2 rounded-full ${TONES[claim.tone].dot}`} />
                <h3 className="text-lg font-bold text-white">{claim.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{claim.description}</p>
                {claim.code && (
                  <code className="mt-4 block truncate rounded-lg border border-white/5 bg-white/5 px-3 py-2 font-mono text-xs text-slate-400">
                    {claim.code}
                  </code>
                )}
                {claim.repo && (
                  <a
                    href={GITHUB_HREF}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
                  >
                    <GitHubMark className="h-4 w-4" />
                    {GITHUB_REPO}
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

        <section id="demo" className="mx-auto max-w-6xl px-6 py-24">
          <div className={`flex flex-wrap items-center justify-between gap-8 ${CARD} border-amber-400/20 p-10`}>
            <div className="max-w-lg">
              <Label tone="amber">{DEMO.eyebrow}</Label>
              <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-amber-50">{DEMO.title}</h2>
              <p className="mt-3 text-slate-400">{DEMO.description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <DemoCta label={DEMO.cta} />
              <EnterButton size="lg" variant="ghost" />
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
