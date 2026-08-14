import type { Metadata } from "next";

import { resolveLang, type LangParams } from "./params";
import { getTranslator } from "./t";

/**
 * The `generateMetadata` every screen inside the application needs.
 *
 * All of them want the same two things — a translated title in the browser tab
 * and to be kept out of every index — and the title key each one uses is
 * already declared in `lib/navigation.ts` next to its route. So the page says
 * which key, and this says the rest:
 *
 *     export const generateMetadata = privatePageMetadata("title.stock");
 *
 * `noindex` is belt and braces. `robots.ts` declines these paths and the
 * middleware turns an anonymous request away before anything renders, but a
 * page that is one session away from being somebody's accounts should say so
 * itself rather than rely on a file at the root being read.
 */
export function privatePageMetadata(titleKey: string) {
  return async function generateMetadata(props: LangParams): Promise<Metadata> {
    const lang = await resolveLang(props);
    return {
      title: getTranslator(lang).t(titleKey),
      robots: { index: false, follow: false },
    };
  };
}
