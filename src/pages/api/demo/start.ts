import type { APIRoute } from "astro";
import { DEMO_MODE_COOKIE } from "../../../lib/runtime";

export const GET: APIRoute = (context) => {
    context.cookies.set(DEMO_MODE_COOKIE, "1", {
        httpOnly: true,
        maxAge: 60 * 60,
        path: "/",
        sameSite: "lax",
        secure: import.meta.env.PROD,
    });
    return context.redirect("/");
};
