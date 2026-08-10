import type { ServerContext } from "../../../lib/server-context";

/**
 * Compatibility endpoint for old bookmarks. New clients start Convex Auth
 * directly through `useAuthActions().signIn("github")`.
 */
export const GET = (context: ServerContext) => context.redirect("/login");

export const POST = (context: ServerContext) => context.redirect("/login?error=github", 303);
