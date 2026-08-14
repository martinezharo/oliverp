/**
 * Where OlivERP lives on the public internet.
 *
 * Canonical links, `hreflang` alternates, the sitemap and Open Graph images
 * all have to be absolute, and all of them are wrong in a way search engines
 * remember if they point at the wrong host. So the origin is declared once
 * here, with an override for anyone running the project on their own domain.
 */

export const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "https://oliverp.4oli.com").replace(/\/$/, "");

/** The bare host, for the places that show it to a reader rather than link it. */
export const SITE_DOMAIN = SITE_ORIGIN.replace(/^https?:\/\//, "");

/** An absolute URL for a path that is already locale-prefixed. */
export function siteUrl(path: string): string {
  return path === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`;
}
