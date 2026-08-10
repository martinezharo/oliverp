import type { APIRoute } from "@/lib/server-context";
import { DEMO_MODE_COOKIE } from "../../../lib/runtime";

export const GET: APIRoute = (context) => {
    context.cookies.set(DEMO_MODE_COOKIE, "1", {
        httpOnly: true,
        maxAge: 60 * 60,
        path: "/",
        sameSite: "lax",
        secure: new URL(context.request.url).protocol === "https:",
    });
    return context.redirect("/");
};
