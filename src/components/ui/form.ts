/**
 * Shared field styling.
 *
 * These class strings were declared separately in the modals and in the
 * transaction filters, and had already drifted apart in padding and focus
 * colour. Fields are the most repeated element in the app, so they are named
 * here once.
 */

/** Full-size field: modal forms. */
export const input =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white transition-all focus:outline-none";

/** Compact field: line-item rows inside a form. */
export const compactInput =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500";

/** Compact field with a placeholder colour: toolbars and filters. */
export const filterInput =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 transition-all focus:border-primary-500 focus:outline-none";

/** Label above a field inside a modal form. */
export const fieldLabel = "block text-xs font-medium uppercase tracking-wider text-slate-400";
