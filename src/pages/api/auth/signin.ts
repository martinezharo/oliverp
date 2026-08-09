import type { APIRoute } from "astro";
import { copySetCookieHeaders, proxyAuthRequest } from "../../../lib/auth-proxy";
import { isDemoMode } from "../../../lib/runtime";

export const GET: APIRoute = (context) => context.redirect("/login");

export const POST: APIRoute = async (context) => {
    if (isDemoMode(context.locals)) {
        return context.redirect("/");
    }

    const formData = await context.request.formData();
    const email = formData.get("email")?.toString();
    const password = formData.get("password")?.toString();

    if (!email || !password) {
        return new Response("Email and password are required", { status: 400 });
    }

    const upstream = await proxyAuthRequest(
        context,
        "sign-in/email",
        JSON.stringify({ email, password, rememberMe: true }),
    );
    if (!upstream.ok) return context.redirect("/login?error=invalid_credentials");

    const response = context.redirect("/");
    copySetCookieHeaders(upstream.headers, response.headers);
    return response;
};
