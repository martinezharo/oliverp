import type { APIRoute } from "@/lib/server-context";
import { DEMO_MODE_COOKIE } from "../../../lib/runtime";

export const GET: APIRoute = (context) => {
    context.cookies.delete(DEMO_MODE_COOKIE, { path: "/" });
    return context.redirect("/login");
};
