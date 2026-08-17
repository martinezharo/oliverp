import type { Metadata } from "next";
import { notFound } from "next/navigation";

import DocumentationArticle from "@/components/documentation/DocumentationArticle";
import { localeAlternates } from "@/i18n/metadata";
import { isLang, type Lang } from "@/i18n/locale";
import { getTranslator } from "@/i18n/t";
import { documentationEntries, documentationEntry } from "@/lib/documentation";
import { documentationPath } from "@/lib/navigation";

type ArticleParams = { params: Promise<{ lang: string; slug: string }> };

export async function generateMetadata({ params }: ArticleParams): Promise<Metadata> {
  const { lang, slug } = await params;
  const entry = documentationEntry(slug);
  if (!isLang(lang) || !entry) return { robots: { index: false, follow: false } };

  const { t } = getTranslator(lang);
  const alternates = localeAlternates(lang, documentationPath(slug));
  return {
    title: `${t("pwa.shortName")} | ${t(entry.titleKey)}`,
    description: t(entry.descriptionKey),
    alternates,
    openGraph: { description: t(entry.descriptionKey), url: alternates.canonical as string },
  };
}

export function generateStaticParams(): Array<{ lang: Lang; slug: string }> {
  return ["en", "es"].flatMap((lang) => documentationEntries.map((entry) => ({ lang: lang as Lang, slug: entry.slug })));
}

export default async function DocumentationArticlePage({ params }: ArticleParams) {
  const { lang, slug } = await params;
  if (!isLang(lang) || !documentationEntry(slug)) notFound();
  return <DocumentationArticle lang={lang} slug={slug} />;
}
