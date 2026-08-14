/**
 * Number, currency and date formatting for the UI.
 *
 * The views each carried their own `Intl` instances against a hard-coded
 * locale, so the same amount could be printed with different fraction digits
 * depending on which screen it appeared in. They are defined once here, and
 * the formatters are cached: `Intl.NumberFormat` construction is the expensive
 * part, and the tables build thousands of cells.
 *
 * They take a language because half of what they produce is language: a month
 * is "February" or "febrero", and €1,234.56 is €1.234,56 to a Spanish reader.
 * Components do not call these directly — `useT()` hands them the set already
 * bound to the page's language, next to `t`.
 */

import type { Lang } from "@/i18n/locale";

/** The Intl locale each language is formatted with. */
const INTL_LOCALES: Record<Lang, string> = { en: "en-GB", es: "es-ES" };

export type Formatters = {
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
  formatInteger: (value: number) => string;
  formatCompact: (value: number) => string;
  formatDate: (value: string | Date, options: Intl.DateTimeFormatOptions) => string;
};

function build(lang: Lang): Formatters {
  const locale = INTL_LOCALES[lang];
  const currency = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" });
  const number = new Intl.NumberFormat(locale);
  const integer = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const compact = new Intl.NumberFormat(locale, { notation: "compact", compactDisplay: "short" });
  // Dates vary by the options each caller passes, so this one is memoised on
  // the options rather than built up front.
  const dates = new Map<string, Intl.DateTimeFormat>();

  return {
    formatCurrency: (value) => currency.format(value),
    formatNumber: (value) => number.format(value),
    formatInteger: (value) => integer.format(value),
    formatCompact: (value) => compact.format(value),
    formatDate: (value, options) => {
      const key = JSON.stringify(options);
      let format = dates.get(key);
      if (!format) {
        format = new Intl.DateTimeFormat(locale, options);
        dates.set(key, format);
      }
      return format.format(new Date(value));
    },
  };
}

const cache: Record<Lang, Formatters> = { en: build("en"), es: build("es") };

export function formatters(lang: Lang): Formatters {
  return cache[lang];
}

/** Today as `YYYY-MM-DD`, the shape every date input and API date field uses. */
export const today = () => new Date().toISOString().slice(0, 10);

/** Trims a timestamp down to the `YYYY-MM-DD` a date input can display. */
export const dateOnly = (value: string) => value.slice(0, 10);
