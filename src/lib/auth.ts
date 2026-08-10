import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { convexAppUrl } from "./runtime";
import type { ServerContext } from "./server-context";

export interface AuthUser {
    id: string;
    tokenIdentifier: string;
    email: string | null;
    name: string | null;
    imageUrl?: string | null;
}

export interface AuthSession {
    user: AuthUser;
    token: string;
}

/**
 * Validates the Convex Auth JWT sent by the browser. Convex Auth stores this
 * token in the client auth provider, so the Next API bridge receives it as a
 * bearer token rather than relying on a second application session cookie.
 */
export async function getAuthSession(context: ServerContext): Promise<AuthSession | null> {
    const appUrl = convexAppUrl(context.locals);
    if (!appUrl) return null;

    const token = context.locals.authToken ?? getBearerToken(context.request);
    if (!token) return null;

    try {
        const client = new ConvexHttpClient(appUrl, { logger: false });
        client.setAuth(token);

        const user = await client.query(api.auth.currentUser, {});
        return user ? { user, token } : null;
    } catch (error) {
        console.error("[auth] Convex session validation failed:", error);
        return null;
    }
}

export function getBearerToken(request: Request): string | null {
    const authorization = request.headers.get("authorization") ?? "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim() || null;
}
