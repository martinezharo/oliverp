import { getEnv } from "./api/env";

export const DEMO_MODE_COOKIE = "erp_demo_mode";

export function convexAppUrl(locals?: App.Locals): string | undefined {
    return getEnv(
        locals,
        "CONVEX_APP_URL",
        "CONVEX_PRODUCTION_URL",
        "CONVEX_URL",
        "PUBLIC_CONVEX_URL",
    );
}

export function convexSiteUrl(locals?: App.Locals): string | undefined {
    return getEnv(
        locals,
        "CONVEX_SITE_URL",
        "VITE_CONVEX_SITE_URL",
        "PUBLIC_CONVEX_SITE_URL",
    );
}

/** Demo mode is now determined only by the Convex data gateway. */
export function isDemoMode(locals?: App.Locals): boolean {
    return Boolean(locals?.demoMode) || !convexAppUrl(locals) || !getEnv(locals, "CONVEX_BRIDGE_SECRET");
}
