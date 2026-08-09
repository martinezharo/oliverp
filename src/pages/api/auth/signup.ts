import type { APIRoute } from "astro";
import { copySetCookieHeaders, proxyAuthRequest } from "../../../lib/auth-proxy";
import { isDemoMode } from "../../../lib/runtime";

export const GET: APIRoute = (context) => context.redirect("/signup");

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
        let code: string | undefined;
        let message = "Unable to create the account.";
        try {
            const payload = JSON.parse(body) as {
                code?: string;
                message?: string;
                error?: { code?: string; message?: string };
            };
            code = payload.code ?? payload.error?.code;
            message = payload.message ?? payload.error?.message ?? message;
        } catch {
            if (body.trim()) message = body;
        }

        const errorText = `${code ?? ""} ${message} ${body}`.toLowerCase();
        const error =
            code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" ||
            errorText.includes("already exists") ||
            errorText.includes("use another email")
                ? "account_exists"
                : errorText.includes("invalid email")
                  ? "invalid_email"
                  : errorText.includes("password too short")
                    ? "password_too_short"
                    : "generic";

        return context.redirect(`/signup?error=${error}`, 303);
    }

    const response = context.redirect("/", 303);
    copySetCookieHeaders(upstream.headers, response.headers);
    return response;
};
