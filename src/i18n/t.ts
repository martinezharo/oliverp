import { formatters, type Formatters } from "@/lib/format";

import { DEFAULT_LOCALE, type Lang } from "./locale";
import { ui } from "./ui";

/**
 * The single translator for the UI.
 *
 * Every component used to declare its own one-line `t`, and they had drifted:
 * some interpolated placeholders, some did not, and only one replaced every
 * occurrence of a placeholder rather than the first. This one always
 * interpolates and always replaces all, so a string behaves the same wherever
 * it is rendered.
 *
 * The language is an argument rather than ambient state on purpose. One server
 * answers requests in both languages at the same time, and a module-level
 * "current language" would be shared between them: a Spanish request would be
 * one `await` away from rendering somebody else's English page. Components get
 * theirs from `useT()`, which reads the context the layout sets from the URL.
 */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

/** Picks the `.zero` / `.one` / `.other` variant of a counted string. */
export type Pluralize = (base: string, count: number) => string;

/**
 * Everything about a page that depends on its language, in one object.
 *
 * The number and date formatters travel with the strings because they are the
 * same decision: a screen that says "febrero" and then prints €1,234.56 is
 * only half translated, and a component that has to remember to ask two
 * different modules for the same language will eventually ask only one.
 */
export type Translator = { lang: Lang; t: Translate; plural: Pluralize } & Formatters;

/**
 * A missing Spanish string falls back to English rather than printing its own
 * key at somebody: a half-translated screen is worth more than
 * `settings.install.action` in the middle of a sentence.
 */
function lookup(lang: Lang, key: string): string {
  return ui[lang][key] ?? ui[DEFAULT_LOCALE][key] ?? key;
}

export function translator(lang: Lang): Translator {
  const t: Translate = (key, values) => {
    let value = lookup(lang, key);
    for (const [name, replacement] of Object.entries(values ?? {})) {
      value = value.replaceAll(`{${name}}`, String(replacement));
    }
    return value;
  };

  const plural: Pluralize = (base, count) => {
    const zero = ui[lang][`${base}.zero`] ?? ui[DEFAULT_LOCALE][`${base}.zero`];
    if (count === 0 && zero) return zero;
    return t(`${base}.${count === 1 ? "one" : "other"}`, { count });
  };

  return { lang, t, plural, ...formatters(lang) };
}

/**
 * Translators are immutable and there are two of them, so they are built once
 * rather than on every render.
 */
const translators: Record<Lang, Translator> = {
  en: translator("en"),
  es: translator("es"),
};

/** The translator for a language. Use `useT()` inside a component instead. */
export function getTranslator(lang: Lang): Translator {
  return translators[lang];
}
