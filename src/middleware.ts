import {
    convexAuthNextjsMiddleware,
    nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

import { AUTH_COOKIE_MAX_AGE_SECONDS } from "@convex/lib/session";
import { routePolicy } from "@/lib/auth/routes";
import { DEMO_MODE_COOKIE } from "@/lib/runtime";

/**
 * Server-side session gate.
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
    const { pathname } = request.nextUrl;
    if (routePolicy(pathname) !== "session_redirect" && pathname !== "/login") return;

    // Demo mode is an explicit, session-less choice by the visitor.
    if (request.cookies.get(DEMO_MODE_COOKIE)?.value === "1") return;

    const authenticated = await convexAuth.isAuthenticated();

    if (pathname === "/login") {
        return authenticated ? nextjsMiddlewareRedirect(request, "/") : undefined;
    }

    if (!authenticated) return nextjsMiddlewareRedirect(request, "/login");
}, {
    // Without this the auth cookies are written without Max-Age, so the
    // browser drops them the moment it ends its session — closing the tab on
    // mobile was enough to be signed out. See `convex/lib/session.ts`.
    cookieConfig: { maxAge: AUTH_COOKIE_MAX_AGE_SECONDS },
});

export const config = {
    // Everything except static assets: the auth cookies have to be refreshed on
    // document requests, and only those can be redirected anyway.
    matcher: ["/((?!_next/static|_next/image|.*\\.[^/]+$).*)"],
};
