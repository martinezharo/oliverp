import Link from "next/link";

import { localeHref } from "@/i18n/locale";
import { resolveLang, type LangParams } from "@/i18n/params";
import { getTranslator } from "@/i18n/t";
import { documentationEntries } from "@/lib/documentation";
import { appPath } from "@/lib/navigation";

import { privatePageMetadata } from "@/i18n/page-metadata";

export const generateMetadata = privatePageMetadata("title.documentation");

const icons: Record<string, string> = {
  guide: "M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z",
  plugins: "M8.5 3v4.5H4M15.5 3v4.5H20M8.5 21v-4.5H4M15.5 21v-4.5H20M9.5 7.5h5a2 2 0 012 2v5a2 2 0 01-2 2h-5a2 2 0 01-2-2v-5a2 2 0 012-2z",
  api: "M8 9l-3 3 3 3m8-6 3 3-3 3m-5 4 2-14",
};

export default async function DocumentationIndex(props: LangParams) {
  const lang = await resolveLang(props);
  const { t } = getTranslator(lang);
  return <div className="space-y-8"><header><div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-400">{t("docs.eyebrow")}</div><h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent">{t("docs.title")}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{t("docs.description")}</p></header><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{documentationEntries.map((entry) => <Link key={entry.slug} href={localeHref(lang, appPath(`documentacion/${entry.slug}`))} className={`docs-card docs-card-${entry.accent} group relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#14151a]/65 p-6 transition-all hover:-translate-y-0.5 hover:border-white/15 hover:shadow-2xl hover:shadow-black/20`}><div className="docs-card-glow absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-20 blur-3xl transition-opacity group-hover:opacity-35" /><div className="relative"><div className="docs-card-icon flex h-11 w-11 items-center justify-center rounded-2xl border bg-white/[0.035]"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={icons[entry.slug]} /></svg></div><h2 className="mt-5 font-semibold text-white">{t(entry.titleKey)}</h2><p className="mt-2 min-h-10 text-sm leading-5 text-slate-500">{t(entry.descriptionKey)}</p><div className="mt-5 flex items-center gap-2 text-xs font-semibold text-slate-500 transition-colors group-hover:text-white">{t("docs.read")} <span className="transition-transform group-hover:translate-x-1">→</span></div></div></Link>)}</div></div>;
}
