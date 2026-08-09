import type { APIRoute } from "astro";
import { copySetCookieHeaders, proxyAuthRequest } from "../../../lib/auth-proxy";

export const POST: APIRoute = async (context) => {
    const upstream = await proxyAuthRequest(context, "sign-out", "{}");
    const response = context.redirect("/login");
    copySetCookieHeaders(upstream.headers, response.headers);
    return response;
};
