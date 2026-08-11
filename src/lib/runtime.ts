import { getEnv } from "./api/env";
import type { ServerLocals } from "./server-context";

export const DEMO_MODE_COOKIE = "erp_demo_mode";

export function convexAppUrl(locals?: ServerLocals): string | undefined {
    return getEnv(locals, "NEXT_PUBLIC_CONVEX_URL");
}

/**
 * Demo mode is a deliberate choice by the visitor, nothing else.
 *
 * It used to also switch on whenever Convex was unconfigured, which meant a
 * production deployment missing `CONVEX_BRIDGE_SECRET` served a convincing
 * mock of the ERP instead of failing. Configuration problems now surface as
 * `not_configured` from `convexConfig`, and demo mode stays a demo.
 */
export function isDemoMode(locals?: ServerLocals): boolean {
    return Boolean(locals?.demoMode);
}
