import type { APIRoute } from "astro";
import { copySetCookieHeaders, proxyAuthRequest } from "../../../lib/auth-proxy";
import { isDemoMode } from "../../../lib/runtime";

export const POST: APIRoute = async (context) => {
    if (isDemoMode(context.locals)) return context.redirect("/");

    const formData = await context.request.formData();
    const name = formData.get("name")?.toString().trim();
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();
    if (!name || !email || !password) {
        return new Response("Name, email and password are required", { status: 400 });
    }

    const upstream = await proxyAuthRequest(
        context,
        "sign-up/email",
        JSON.stringify({ name, email, password }),
    );
    if (!upstream.ok) {
        const body = await upstream.text();
        let message = "Unable to create the account.";
        try {
            const payload = JSON.parse(body) as { message?: string; error?: { message?: string } };
            message = payload.message ?? payload.error?.message ?? message;
        } catch {
            if (body.trim()) message = body;
        }
        return new Response(message, { status: upstream.status });
    }

    const response = context.redirect("/");
    copySetCookieHeaders(upstream.headers, response.headers);
    return response;
};
