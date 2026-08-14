import type { Metadata } from "next";

import { AppPreview } from "@/components/landing/AppPreview";
import { CLAIMS, DEMO, GITHUB_HREF, GITHUB_REPO, HERO, MODULES } from "@/components/landing/content";
import { LandingNav } from "@/components/landing/LandingNav";
import { StandaloneRedirect } from "@/components/landing/StandaloneRedirect";
import { t } from "@/i18n/t";
import { TONES } from "@/components/landing/tones";
import { CARD, CTA_ITEM, CTA_ROW, DemoButton, DemoCta, EnterButton, GitHubMark, Label, LandingFooter } from "@/components/landing/ui";

export const metadata: Metadata = {
  title: t("landing.meta.title"),
  description: t("landing.meta.description"),
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
      <StandaloneRedirect />
      <LandingNav />

      <main>
        <section className="relative overflow-hidden border-b border-white/5">
          <div className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-primary-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 left-0 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />

          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-28 sm:px-6 sm:pb-24 sm:pt-36 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-emerald-300 sm:px-3.5 sm:text-[11px]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                {HERO.eyebrow}
              </span>

              <h1 className="mt-5 text-balance text-[2.5rem] font-bold leading-[1.08] tracking-tight text-white sm:mt-6 sm:text-5xl sm:leading-[1.05] lg:text-6xl">
                {HERO.title[0]}
                <span className="bg-linear-to-r from-primary-400 to-indigo-400 bg-clip-text text-transparent">{HERO.title[1]}</span>
                {HERO.title[2]}
              </h1>

              <p className="mt-5 max-w-md text-base leading-relaxed text-slate-400 sm:mt-6 sm:text-lg">{HERO.lede}</p>

              <div className={`mt-8 sm:mt-9 ${CTA_ROW}`}>
                <EnterButton size="lg" className={CTA_ITEM} />
                <DemoButton size="lg" className={CTA_ITEM} />
              </div>

              <p className="mt-5 font-mono text-[11px] leading-relaxed text-slate-600 sm:text-xs">{HERO.note}</p>
            </div>

            <div className="relative">
              <AppPreview compact />
            </div>
          </div>
        </section>

        {/* `scroll-mt` keeps the heading clear of the fixed header when the
            in-page links jump here. */}
        <section id="modulos" className="mx-auto grid max-w-6xl scroll-mt-20 gap-8 px-5 py-16 sm:px-6 sm:py-24 lg:grid-cols-[300px_1fr] lg:gap-12">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Label tone="blue">{t("landing.modules.label")}</Label>
            <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
              {t("landing.modules.title")}
            </h2>
            <p className="mt-4 text-slate-400">
              {t("landing.modules.description")}
            </p>
            <EnterButton className="mt-7 w-full sm:mt-8 sm:w-auto" />
          </div>

          {/* The rows carry their own padding and pull it back with a negative
              margin, so the surface that appears on hover has room around the
              text instead of hugging it. */}
          <div className="-mx-3 border-t border-white/5 sm:-mx-5">
            {MODULES.map((module) => {
              const tone = TONES[module.tone];
              return (
                <article
                  key={module.title}
                  className="group flex gap-4 rounded-2xl border-b border-white/5 px-3 py-6 transition-all hover:bg-white/[0.02] sm:gap-5 sm:px-5 sm:py-7 sm:hover:pl-7"
                >
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors sm:h-12 sm:w-12 ${tone.badge}`}>
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 sm:h-6 sm:w-6 ${tone.accent}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {module.icon}
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-white sm:text-lg">{module.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{module.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-y border-white/5 bg-white/[0.015]">
          {/* Stacked, the cards need more air between them than they do as
              three columns, where the gap is horizontal. */}
          <div className="mx-auto grid max-w-6xl gap-9 px-5 py-14 sm:px-6 sm:py-20 md:grid-cols-3 md:gap-6">
            {CLAIMS.map((claim) => (
              <div key={claim.title} className="border-t border-white/10 pt-6">
                <span className={`mb-4 block h-2 w-2 rounded-full ${TONES[claim.tone].dot}`} />
                <h3 className="text-lg font-bold text-white">{claim.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{claim.description}</p>
                {claim.code && (
                  // A URL worth copying, so it wraps rather than truncating on
                  // the narrow screens where it does not fit on one line.
                  <code className="mt-4 block break-all rounded-lg border border-white/5 bg-white/5 px-3 py-2 font-mono text-xs leading-relaxed text-slate-400">
                    {claim.code}
                  </code>
                )}
                {claim.repo && (
                  <a
                    href={GITHUB_HREF}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 -ml-2 inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
                  >
                    <GitHubMark className="h-4 w-4 shrink-0" />
                    {GITHUB_REPO}
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

        <section id="demo" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 sm:px-6 sm:py-24">
          <div className={`flex flex-wrap items-center justify-between gap-7 ${CARD} border-amber-400/20 p-6 sm:gap-8 sm:p-10`}>
            <div className="max-w-lg">
              <Label tone="amber">{DEMO.eyebrow}</Label>
              <h2 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-amber-50 sm:text-3xl">{DEMO.title}</h2>
              <p className="mt-3 text-slate-400">{DEMO.description}</p>
            </div>
            <div className={`w-full sm:w-auto ${CTA_ROW}`}>
              <DemoCta label={DEMO.cta} className={CTA_ITEM} />
              <EnterButton size="lg" variant="ghost" className={CTA_ITEM} />
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
