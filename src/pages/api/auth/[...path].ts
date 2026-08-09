import type { APIRoute } from "astro";
import { proxyAuthRequest } from "../../../lib/auth-proxy";

export const ALL: APIRoute = (context) =>
    proxyAuthRequest(context, context.params.path ?? "");
