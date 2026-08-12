/**
 * Number, currency and date formatting for the UI.
 *
 * The views each carried their own `Intl` instances against a hard-coded
 * locale, so the same amount could be printed with different fraction digits
 * depending on which screen it appeared in. They are defined once here, and
 * the formatters are cached: `Intl.NumberFormat` construction is the expensive
 * part, and the tables build thousands of cells.
 */

export const LOCALE = "en-GB";

const currencyFormat = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR" });
const numberFormat = new Intl.NumberFormat(LOCALE);
const integerFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const compactFormat = new Intl.NumberFormat(LOCALE, { notation: "compact", compactDisplay: "short" });

export const formatCurrency = (value: number) => currencyFormat.format(value);
export const formatNumber = (value: number) => numberFormat.format(value);
export const formatInteger = (value: number) => integerFormat.format(value);
export const formatCompact = (value: number) => compactFormat.format(value);

export function formatDate(value: string | Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(LOCALE, options).format(new Date(value));
}

/** Today as `YYYY-MM-DD`, the shape every date input and API date field uses. */
export const today = () => new Date().toISOString().slice(0, 10);

/** Trims a timestamp down to the `YYYY-MM-DD` a date input can display. */
export const dateOnly = (value: string) => value.slice(0, 10);
