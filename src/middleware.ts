import { defineMiddleware } from "astro/middleware";
import { getAuthSession } from "./lib/auth";
import { DEMO_MODE_COOKIE, isDemoMode } from "./lib/runtime";
import { routePolicy } from "./lib/auth/routes";
import { getLangFromHeader, getLocale, useTranslations } from "./i18n/utils";

const SESSION_COOKIES = [
    "better-auth.session_token",
    "__Secure-better-auth.session_token",
    "convex_jwt",
    "better-auth.convex_jwt",
    "__Secure-convex_jwt",
    "__Secure-better-auth.convex_jwt",
] as const;

function unauthorizedJson(message: string): Response {
    return new Response(JSON.stringify({ error: message }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
    });
}

export const onRequest = defineMiddleware(async ({ cookies, redirect, request, locals }, next) => {
    // Resolve language from the browser's Accept-Language header. Done first so
    // it is available to both pages and API routes (including demo mode).
    const lang = getLangFromHeader(request.headers.get("accept-language"));
    locals.lang = lang;
    locals.locale = getLocale(lang);
    locals.t = useTranslations(lang);
    locals.demoMode = cookies.get(DEMO_MODE_COOKIE)?.value === "1";

    // In demo mode, skip all authentication checks
    if (isDemoMode(locals)) {
        return next();
    }

    const policy = routePolicy(new URL(request.url).pathname);
    if (policy === "public" || policy === "self_authenticated") {
        return next();
    }

    // The session is *validated*, not merely detected. Checking that the cookies
    // exist would let anyone through by sending two cookies of their own
    // choosing, leaving row-level security as the only thing between a forged
    // request and the books.
    const session = await getAuthSession({ cookies, locals, redirect, request } as never);

    if (!session) {
        if (policy === "session_json") {
            return unauthorizedJson(locals.t("api.unauthorized"));
        }
        // Clear the rejected cookies so a stale or tampered session does not
        // bounce the browser between /login and the page forever.
        for (const name of SESSION_COOKIES) cookies.delete(name, { path: "/" });
        return redirect("/login");
    }

    // Handed to pages and routes so a validated session is not re-fetched once
    // per component.
    locals.user = session.user;
    locals.authToken = session.token;

    return next();
});
