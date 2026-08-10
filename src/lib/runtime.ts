import { getEnv } from "./api/env";
import type { ServerLocals } from "./server-context";

export const DEMO_MODE_COOKIE = "erp_demo_mode";

export function convexAppUrl(locals?: ServerLocals): string | undefined {
    return getEnv(
        locals,
        "CONVEX_APP_URL",
        "CONVEX_PRODUCTION_URL",
        "CONVEX_URL",
        "PUBLIC_CONVEX_URL",
        "NEXT_PUBLIC_CONVEX_URL",
    );
}

export function convexSiteUrl(locals?: ServerLocals): string | undefined {
    return getEnv(
        locals,
        "CONVEX_SITE_URL",
        "VITE_CONVEX_SITE_URL",
        "PUBLIC_CONVEX_SITE_URL",
    );
}

/** Demo mode is now determined only by the Convex data gateway. */
export function isDemoMode(locals?: ServerLocals): boolean {
    return Boolean(locals?.demoMode) || !convexAppUrl(locals) || !getEnv(locals, "CONVEX_BRIDGE_SECRET");
}
