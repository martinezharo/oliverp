/**
 * Shared button styling.
 *
 * Settings, the modals and the key list each carried their own copy of these
 * class strings and had already drifted in padding and in how they dimmed a
 * disabled control. Hover is scoped with `enabled:` so a disabled button never
 * lights up under the cursor, which is what the long `disabled:hover:` tails
 * used to be for.
 */

/** One size for every button, so two of them side by side always match. */
const base =
  "rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40";

/** Neutral action: the common case. */
export const secondaryButton = `${base} border border-white/10 bg-white/5 text-slate-200 enabled:hover:border-primary-500/40 enabled:hover:bg-primary-500/10 enabled:hover:text-white`;

/** Action that dismisses rather than does: cancel, close. */
export const ghostButton = `${base} text-slate-400 enabled:hover:bg-white/5 enabled:hover:text-white`;

/** Destructive action that is not what the screen is for. */
export const dangerButton = `${base} border border-red-500/20 bg-red-500/5 text-red-300 enabled:hover:border-red-400/40 enabled:hover:bg-red-500/10 enabled:hover:text-red-200`;

/** Destructive action the user came for; always behind a confirmation. */
export const dangerSolidButton = `${base} bg-red-500 text-white shadow-lg shadow-red-500/20 enabled:hover:bg-red-600 disabled:shadow-none`;

/** Primary action: what the form it sits in exists to do. */
export const primaryButton = `${base} bg-primary-500 text-white shadow-lg shadow-primary-500/20 enabled:hover:bg-primary-600 disabled:shadow-none`;
