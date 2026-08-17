import Link from "next/link";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/ui/Logo";
import { localeHref, type Lang } from "@/i18n/locale";
import { getTranslator } from "@/i18n/t";
import { APP_ROOT } from "@/lib/navigation";

/**
 * Public documentation chrome. It deliberately lives outside the `/app`
 * segment, so it provides a way around the documents without mounting the
 * authenticated ERP shell above them.
 */
export default function DocumentationLayout({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const { t } = getTranslator(lang);

  return (
    <div data-public-documentation className="min-h-screen">
      <header data-documentation-header className="border-b border-white/5 bg-[#0f1016]/80 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center gap-4 px-5 sm:px-6">
          <Link
            href={localeHref(lang, "/")}
            aria-label={`${t("pwa.shortName")} — ${t("docs.title")}`}
            className="shrink-0"
          >
            <Logo />
          </Link>
          <span aria-hidden="true" className="hidden text-slate-700 sm:inline">/</span>
          <span className="hidden text-sm font-medium text-slate-400 sm:inline">{t("docs.title")}</span>

          <nav aria-label={t("docs.navigation")} className="ml-auto flex items-center gap-2 sm:gap-4">
            <LanguageSwitcher />
            <Link
              href={localeHref(lang, APP_ROOT)}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-primary-500/30 hover:text-white sm:px-4"
            >
              <span className="hidden sm:inline">{t("docs.openApp")}</span>
              <span className="sm:hidden" aria-hidden="true">→</span>
              <span className="hidden sm:inline" aria-hidden="true">→</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-6 sm:py-14">{children}</main>
    </div>
  );
}
