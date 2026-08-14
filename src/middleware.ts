import {
    convexAuthNextjsMiddleware,
    nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import type { NextRequest } from "next/server";

import { AUTH_COOKIE_MAX_AGE_SECONDS } from "@convex/lib/session";
import { LOCALE_COOKIE } from "@/i18n/cookie";
import { DEFAULT_LOCALE, isLang, localeHref, negotiateLocale, splitLocale } from "@/i18n/locale";
import { routePolicy } from "@/lib/auth/routes";
import { APP_ROOT } from "@/lib/navigation";
import { DEMO_MODE_COOKIE } from "@/lib/runtime";

/**
 * Server-side session gate, and the one place a visitor's language is chosen
 * for them.
 *
 * Convex Auth stores its tokens in cookies once the app is wrapped in
 * `ConvexAuthNextjsServerProvider`, which is what lets this run before any
 * rendering happens: an anonymous visitor is redirected to `/login` by the
 * edge, so the application shell is never sent to the browser and there is no
 * flash of the app before the redirect. The client-side guard in `ErpShell`
 * stays as a safety net for a session that expires mid-visit.
 *
 * Only page routes are gated here. The JSON API authenticates itself from the
 * `Authorization` header it receives (and demo mode has no session at all), so
 * turning those into cookie-based redirects would break both.
 */
export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
    // The language sits in front of the path; everything below reasons about
    // the path alone, and puts the language back when it builds a redirect.
    const { lang, path } = splitLocale(request.nextUrl.pathname);

    const language = languageRedirect(request, lang, path);
    if (language) return language;

    if (routePolicy(path) !== "session_redirect" && path !== "/login") return;

    // Demo mode is an explicit, session-less choice by the visitor.
    if (request.cookies.get(DEMO_MODE_COOKIE)?.value === "1") return;

    const authenticated = await convexAuth.isAuthenticated();

    if (path === "/login") {
        return authenticated ? nextjsMiddlewareRedirect(request, localeHref(lang, APP_ROOT)) : undefined;
    }

    if (!authenticated) return nextjsMiddlewareRedirect(request, localeHref(lang, "/login"));
}, {
    // Without this the auth cookies are written without Max-Age, so the
    // browser drops them the moment it ends its session — closing the tab on
    // mobile was enough to be signed out. See `convex/lib/session.ts`.
    cookieConfig: { maxAge: AUTH_COOKIE_MAX_AGE_SECONDS },
});

/**
 * Sends a visitor to the language they can read, once.
 *
 * Only ever from an unprefixed address to a prefixed one, and only when the
 * visitor has expressed no preference of their own: the cookie the language
 * switcher writes is the last word, so choosing English in a Spanish browser
 * sticks instead of being undone on the next click. A `/es/…` address is never
 * redirected — someone who typed or followed one has asked for Spanish more
 * plainly than any header could.
 *
 * The API is left alone. It answers programs, which have no language, and
 * `/api/demo/start` redirected into `/es/api/demo/start` is simply a 404.
 *
 * Search engines are not exempted, because they do not need to be: they send
 * no `Accept-Language`, so they fall through to the default and index the
 * unprefixed English page, which is the one its own `hreflang` names.
 */
function languageRedirect(request: NextRequest, lang: string, path: string) {
    if (lang !== DEFAULT_LOCALE || path.startsWith("/api/")) return undefined;

    const chosen = request.cookies.get(LOCALE_COOKIE)?.value;
    const wanted = isLang(chosen) ? chosen : negotiateLocale(request.headers.get("accept-language"));
    if (wanted === DEFAULT_LOCALE) return undefined;

    return nextjsMiddlewareRedirect(request, `${localeHref(wanted, path)}${request.nextUrl.search}`);
}

export const config = {
    // Everything except static assets: the auth cookies have to be refreshed on
    // document requests, and only those can be redirected anyway.
    matcher: ["/((?!_next/static|_next/image|.*\\.[^/]+$).*)"],
};
