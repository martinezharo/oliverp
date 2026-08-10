import type { ServerContext } from "../../../lib/server-context";

export const GET = (context: ServerContext) => context.redirect("/login", 302);
export const POST = (context: ServerContext) => context.redirect("/login", 303);
