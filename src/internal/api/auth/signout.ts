import type { ServerContext } from "../../../lib/server-context";

// Convex Auth is held by the browser provider. This endpoint only keeps old
// form submissions from failing and never handles credentials itself.
export const POST = (context: ServerContext) => context.redirect("/login", 303);
