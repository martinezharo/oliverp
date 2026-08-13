import type { APIRoute } from "@/lib/server-context";
import { DEMO_MODE_COOKIE } from "../../../lib/runtime";

export const GET: APIRoute = (context) => {
    context.cookies.delete(DEMO_MODE_COOKIE, { path: "/" });
    // Leaving the demo is not a request to sign in: the visitor goes back to
    // the landing page, which is public and offers both ways in again.
    return context.redirect("/");
};
