import { notFound } from "next/navigation";

import { isLang, type Lang } from "./locale";

/**
 * Reading the language out of the route.
 *
 * Every page and layout under `app/[lang]` needs the same three lines, so they
 * live here rather than being retyped: take the params, check the segment is a
 * language OlivERP actually has, and hand back the typed value.
 *
 * Anything else is a 404 rather than a silent fallback to English — a URL that
 * names a language nobody translated is a mistake, and answering it with a
 * page would let a search engine index the same content under any prefix it
 * cared to invent.
 */

export type LangParams = { params: Promise<{ lang: string }> };

export async function resolveLang({ params }: LangParams): Promise<Lang> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return lang;
}
