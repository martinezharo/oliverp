import { ui } from "./ui";

/**
 * The single translator for the UI.
 *
 * Every component used to declare its own one-line `t`, and they had drifted:
 * some interpolated placeholders, some did not, and only one replaced every
 * occurrence of a placeholder rather than the first. This one always
 * interpolates and always replaces all, so a string behaves the same wherever
 * it is rendered.
 */
export function t(key: string, values?: Record<string, string | number>): string {
  let value = ui.en[key] ?? key;
  for (const [name, replacement] of Object.entries(values ?? {})) {
    value = value.replaceAll(`{${name}}`, String(replacement));
  }
  return value;
}

/** Picks the `.zero` / `.one` / `.other` variant of a counted string. */
export function plural(base: string, count: number): string {
  const zero = ui.en[`${base}.zero`];
  if (count === 0 && zero) return zero;
  return t(`${base}.${count === 1 ? "one" : "other"}`, { count });
}
