import type { APIContext } from "astro";
import { convexSiteUrl } from "./runtime";

const HOP_BY_HOP_HEADERS = new Set([
    "connection",
    "content-length",
    "host",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
]);

function setCookieHeaders(headers: Headers): string[] {
    const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
    if (getSetCookie) return getSetCookie.call(headers);
    const value = headers.get("set-cookie");
    return value ? [value] : [];
}

export function copySetCookieHeaders(source: Headers, target: Headers): void {
    for (const cookie of setCookieHeaders(source)) target.append("set-cookie", cookie);
}

function upstreamHeaders(context: APIContext): Headers {
    const headers = new Headers();
    for (const [name, value] of context.request.headers) {
        const lower = name.toLowerCase();
        if (HOP_BY_HOP_HEADERS.has(lower) || lower.startsWith("x-better-auth-forwarded-")) {
            continue;
        }
        headers.set(name, value);
    }

    const requestUrl = new URL(context.request.url);
    headers.set("x-better-auth-forwarded-host", requestUrl.host);
    headers.set("x-better-auth-forwarded-proto", requestUrl.protocol.slice(0, -1));
    if (!headers.has("origin")) headers.set("origin", requestUrl.origin);
    return headers;
}

/** Forwards the same-origin auth API to the Convex HTTP endpoint. */
export async function proxyAuthRequest(
    context: APIContext,
    path: string,
    body?: string,
): Promise<Response> {
    const siteUrl = convexSiteUrl(context.locals);
    if (!siteUrl) {
        return new Response("Convex authentication is not configured.", { status: 503 });
    }

    const target = new URL(`/api/auth/${path.replace(/^\/+/, "")}`, `${siteUrl.replace(/\/$/, "")}/`);
    target.search = new URL(context.request.url).search;

    const requestBody = body ?? (context.request.method === "GET" || context.request.method === "HEAD"
        ? undefined
        : await context.request.arrayBuffer());
    const headers = upstreamHeaders(context);
    if (body !== undefined) headers.set("content-type", "application/json");

    const response = await fetch(target, {
        method: context.request.method,
        headers,
        body: requestBody,
        redirect: "manual",
    });

    const responseHeaders = new Headers();
    for (const [name, value] of response.headers) {
        const lower = name.toLowerCase();
        if (lower === "set-cookie" || lower === "content-length" || lower === "content-encoding") continue;
        responseHeaders.set(name, value);
    }
    copySetCookieHeaders(response.headers, responseHeaders);

    return new Response(await response.arrayBuffer(), {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
    });
}
