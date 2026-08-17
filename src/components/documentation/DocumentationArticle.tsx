import Link from "next/link";
import { notFound } from "next/navigation";

import { localeHref, type Lang } from "@/i18n/locale";
import { getTranslator } from "@/i18n/t";
import { documentationEntries, documentationEntry, renderDocumentation } from "@/lib/documentation";
import { documentationPath } from "@/lib/navigation";

export default function DocumentationArticle({ lang, slug }: { lang: Lang; slug: string }) {
  const { t } = getTranslator(lang);
  const entry = documentationEntry(slug);
  if (!entry) notFound();

  const html = renderDocumentation(entry, lang);
  const sourceFile = lang === "es" ? entry.file.replace(/\.md$/, ".es.md") : entry.file;

  return (
    <div data-documentation-article className="grid gap-7 xl:grid-cols-[230px_minmax(0,1fr)]">
      <aside data-documentation-sidebar>
        <Link href={localeHref(lang, documentationPath())} className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-white">
          ← {t("docs.backToAll")}
        </Link>
        <nav aria-label={t("docs.navigation")} className="flex gap-2 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible xl:pb-0">
          {documentationEntries.map((item) => (
            <Link
              key={item.slug}
              href={localeHref(lang, documentationPath(item.slug))}
              className={`whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm transition-colors ${item.slug === slug ? "bg-primary-500/10 font-medium text-primary-300" : "text-slate-500 hover:bg-white/[0.035] hover:text-white"}`}
            >
              {t(item.titleKey)}
            </Link>
          ))}
        </nav>
      </aside>

      <article className="min-w-0 overflow-hidden rounded-3xl border border-white/[0.07] bg-[#14151a]/60">
        <header className="border-b border-white/5 bg-gradient-to-r from-white/[0.035] to-transparent px-6 py-7 sm:px-9">
          <div className="text-[10px] font-bold uppercase tracking-[0.17em] text-primary-400">{sourceFile}</div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">{t(entry.titleKey)}</h1>
          <p className="mt-2 text-sm text-slate-500">{t(entry.descriptionKey)}</p>
        </header>
        <div className="docs-prose px-6 py-8 sm:px-9" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </div>
  );
}
