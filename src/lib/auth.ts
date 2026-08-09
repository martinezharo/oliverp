import { getToken } from "@convex-dev/better-auth/utils";
import { ConvexHttpClient } from "convex/browser";
import type { APIContext } from "astro";
import { api } from "../../convex/_generated/api";
import { ApiError } from "./api/errors";
import { convexAppUrl, convexSiteUrl } from "./runtime";

export interface AuthUser {
    id: string;
    tokenIdentifier: string;
    email: string;
    name: string;
}

export interface AuthSession {
    user: AuthUser;
    token: string;
}

/**
 * Exchanges the Better Auth session cookie for a Convex JWT, then validates
 * that JWT with a Convex query. The browser never receives the bridge secret.
 */
export async function getAuthSession(context: APIContext): Promise<AuthSession | null> {
    const appUrl = convexAppUrl(context.locals);
    const siteUrl = convexSiteUrl(context.locals);
    if (!appUrl || !siteUrl) return null;

    const headers = new Headers(context.request.headers);
    const { token } = await getToken(siteUrl, headers);
    if (!token) return null;

    const client = new ConvexHttpClient(appUrl, { logger: false });
    client.setAuth(token);

    try {
        const user = await client.query(api.auth.currentUser, {});
        return user ? { user, token } : null;
    } catch (error) {
        console.error("[auth] Convex session validation failed:", error);
        throw new ApiError("unauthorized", "La sesion no es valida.", {
            hint: "Vuelve a iniciar sesion.",
        });
    }
}
