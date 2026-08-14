/**
 * Where a deliberate choice of language is remembered.
 *
 * Separate from `locale.ts` because the middleware, which runs on the edge,
 * and the switcher in the browser both need the name and nothing else. It is
 * readable by scripts on purpose — the switcher writes it — and carries no
 * personal data, so it is not `httpOnly` and needs no consent banner.
 */

export const LOCALE_COOKIE = "erp_lang";

/** A year: long enough that the choice outlives the visit that made it. */
export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * Remembers a deliberate choice of language, so the middleware stops
 * negotiating one from `Accept-Language` on the next request.
 *
 * A plain function rather than an inline assignment in the switcher: writing
 * to `document` is a side effect on the world outside React, and keeping it
 * here is both where it belongs and what lets the component stay a component.
 */
export function rememberLocale(lang: string): void {
  document.cookie = `${LOCALE_COOKIE}=${lang}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}
