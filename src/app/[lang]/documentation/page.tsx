import type { Metadata } from "next";

import DocumentationIndex from "@/components/documentation/DocumentationIndex";
import { localeAlternates } from "@/i18n/metadata";
import { resolveLang, type LangParams } from "@/i18n/params";
import { getTranslator } from "@/i18n/t";
import { documentationPath } from "@/lib/navigation";

export async function generateMetadata(props: LangParams): Promise<Metadata> {
  const lang = await resolveLang(props);
  const { t } = getTranslator(lang);
  const alternates = localeAlternates(lang, documentationPath());
  return {
    title: `${t("pwa.shortName")} | ${t("docs.title")}`,
    description: t("docs.description"),
    alternates,
    openGraph: { description: t("docs.description"), url: alternates.canonical as string },
  };
}

export default async function DocumentationPage(props: LangParams) {
  const lang = await resolveLang(props);
  return <DocumentationIndex lang={lang} />;
}
