import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { APIRoute } from "@/lib/server-context";
import type { CookieOptions, CookieStore, ServerContext, ServerLocals } from "@/lib/server-context";
import { getAuthSession } from "@/lib/auth";
import { isDemoMode } from "@/lib/runtime";

import * as authCatchAll from "@/internal/api/auth/[...path]";
import * as authIdentity from "@/internal/api/auth/identity";
import * as authSignIn from "@/internal/api/auth/signin";
import * as authSignOut from "@/internal/api/auth/signout";
import * as authSignUp from "@/internal/api/auth/signup";
import * as accountDelete from "@/internal/api/account/delete";
import * as demoExit from "@/internal/api/demo/exit";
import * as demoStart from "@/internal/api/demo/start";
import * as demoStatus from "@/internal/api/demo/status";
import * as keyCreate from "@/internal/api/keys/create";
import * as keyRevoke from "@/internal/api/keys/revoke";
import * as productCreate from "@/internal/api/products/create";
import * as pluginResolve from "@/internal/api/plugins/resolve";
import * as projectCreate from "@/internal/api/projects/create";
import * as projectDelete from "@/internal/api/projects/delete";
import * as purchaseCreate from "@/internal/api/purchases/create";
import * as purchaseGet from "@/internal/api/purchases/get";
import * as purchaseUpdate from "@/internal/api/purchases/update";
import * as saleCreate from "@/internal/api/sales/create";
import * as saleGet from "@/internal/api/sales/get";
import * as saleInit from "@/internal/api/sales/init-data";
import * as saleUpdate from "@/internal/api/sales/update";
import * as statsEvolution from "@/internal/api/stats/evolution";
import * as stockAdjust from "@/internal/api/stock/adjust";
import * as stockMovements from "@/internal/api/stock/movements";
import * as transactionConcepts from "@/internal/api/transactions/concepts";
import * as transactionDelete from "@/internal/api/transactions/delete";
import * as transactionDetails from "@/internal/api/transactions/details";
import * as transactionGetOther from "@/internal/api/transactions/get-other";
import * as transactionList from "@/internal/api/transactions/list";
import * as transactionSave from "@/internal/api/transactions/save";
import * as clientes from "@/internal/api/v1/clientes";
import * as compras from "@/internal/api/v1/compras";
import * as compraById from "@/internal/api/v1/compras/[id]";
import * as finanzas from "@/internal/api/v1/finanzas";
import * as marketplace from "@/internal/api/v1/importaciones/marketplace";
import * as wallapop from "@/internal/api/v1/importaciones/wallapop";
import * as openapi from "@/internal/api/v1/openapi.json";
import * as productos from "@/internal/api/v1/productos";
import * as productoById from "@/internal/api/v1/productos/[id]";
import * as proyectos from "@/internal/api/v1/proyectos";
import * as stock from "@/internal/api/v1/stock";
import * as stockAdjustments from "@/internal/api/v1/stock/ajustes";
import * as transacciones from "@/internal/api/v1/transacciones";
import * as transaccionById from "@/internal/api/v1/transacciones/[id]";
import * as ventas from "@/internal/api/v1/ventas";
import * as ventaById from "@/internal/api/v1/ventas/[id]";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type LegacyModule = Partial<Record<Method | "ALL", APIRoute>>;

const exactRoutes = new Map<string, LegacyModule>([
  ["/api/auth/identity", authIdentity], ["/api/auth/signin", authSignIn], ["/api/auth/signout", authSignOut], ["/api/auth/signup", authSignUp],
  ["/api/account/delete", accountDelete],
  ["/api/demo/exit", demoExit], ["/api/demo/start", demoStart], ["/api/demo/status", demoStatus],
  ["/api/keys/create", keyCreate], ["/api/keys/revoke", keyRevoke],
  ["/api/plugins/resolve", pluginResolve], ["/api/products/create", productCreate], ["/api/projects/create", projectCreate], ["/api/projects/delete", projectDelete], ["/api/purchases/create", purchaseCreate], ["/api/purchases/get", purchaseGet], ["/api/purchases/update", purchaseUpdate],
  ["/api/sales/create", saleCreate], ["/api/sales/get", saleGet], ["/api/sales/init-data", saleInit], ["/api/sales/update", saleUpdate],
  ["/api/stats/evolution", statsEvolution], ["/api/stock/adjust", stockAdjust], ["/api/stock/movements", stockMovements],
  ["/api/transactions/concepts", transactionConcepts], ["/api/transactions/delete", transactionDelete], ["/api/transactions/details", transactionDetails], ["/api/transactions/get-other", transactionGetOther], ["/api/transactions/list", transactionList], ["/api/transactions/save", transactionSave],
  ["/api/v1/clientes", clientes], ["/api/v1/compras", compras], ["/api/v1/finanzas", finanzas], ["/api/v1/importaciones/marketplace", marketplace], ["/api/v1/importaciones/wallapop", wallapop], ["/api/v1/openapi.json", openapi], ["/api/v1/productos", productos], ["/api/v1/proyectos", proyectos], ["/api/v1/stock", stock], ["/api/v1/stock/ajustes", stockAdjustments], ["/api/v1/transacciones", transacciones], ["/api/v1/ventas", ventas],
]);

function runtimeEnv(): Record<string, unknown> | undefined {
  try {
    return getCloudflareContext().env as unknown as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function parseCookies(request: Request): Map<string, string> {
  return new Map((request.headers.get("cookie") ?? "").split(";").flatMap((part) => {
    const index = part.indexOf("=");
    if (index <= 0) return [];
    return [[part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())]];
  }));
}

function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  parts.push(`Path=${options.path ?? "/"}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite[0].toUpperCase()}${options.sameSite.slice(1)}`);
  return parts.join("; ");
}

function cookieStore(request: Request): { store: CookieStore; headers: string[] } {
  const values = parseCookies(request);
  const headers: string[] = [];
  const store: CookieStore = {
    get: (name) => {
      const value = values.get(name);
      return value === undefined ? undefined : { value };
    },
    set: (name, value, options) => headers.push(serializeCookie(name, value, options)),
    delete: (name, options) => headers.push(serializeCookie(name, "", { ...options, maxAge: 0 })),
  };
  return { store, headers };
}

function adaptResponse(response: Response, cookieHeaders: string[]): Response {
  if (!cookieHeaders.length) return response;
  const adapted = new Response(response.body, response);
  for (const header of cookieHeaders) adapted.headers.append("set-cookie", header);
  return adapted;
}

function contextFor(request: Request, params: Record<string, string | undefined>): { context: ServerContext; cookieHeaders: string[] } {
  const cookies = cookieStore(request);
  const locals: ServerLocals = { runtime: { env: runtimeEnv() } };
  locals.demoMode = cookies.store.get("erp_demo_mode")?.value === "1";
  const url = new URL(request.url);
  return {
    cookieHeaders: cookies.headers,
    context: {
      request,
      url,
      params,
      locals,
      cookies: cookies.store,
      // Keep redirects relative so the browser preserves the host that set a
      // demo cookie (Next dev may otherwise normalize 127.0.0.1 to localhost).
      redirect: (path, status = 302) => new Response(null, { status, headers: { location: path } }),
    },
  };
}

function routeFor(pathname: string, params: Record<string, string | undefined>): LegacyModule | null {
  const exact = exactRoutes.get(pathname);
  if (exact) return exact;
  if (pathname.startsWith("/api/auth/")) {
    params.path = pathname.slice("/api/auth/".length);
    return authCatchAll;
  }
  if (/^\/api\/v1\/compras\/[^/]+$/.test(pathname)) return compraById;
  if (/^\/api\/v1\/productos\/[^/]+$/.test(pathname)) return productoById;
  if (/^\/api\/v1\/transacciones\/[^/]+$/.test(pathname)) return transaccionById;
  if (/^\/api\/v1\/ventas\/[^/]+$/.test(pathname)) return ventaById;
  return null;
}

async function dispatch(request: Request, rawParams: { path?: string[] }): Promise<Response> {
  const pathParts = rawParams.path ?? [];
  const pathname = `/api/${pathParts.join("/")}`.replace(/\/+/g, "/");
  const params: Record<string, string | undefined> = {};
  const idMatch = pathname.match(/^\/api\/v1\/(?:compras|productos|transacciones|ventas)\/([^/]+)$/);
  if (idMatch) params.id = decodeURIComponent(idMatch[1]);
  const routeModule = routeFor(pathname, params);
  if (!routeModule) return Response.json({ error: "Not found" }, { status: 404 });
  const method = request.method as Method;
  const handler = routeModule[method] ?? routeModule.ALL;
  if (!handler) return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: Object.keys(routeModule).filter((key) => key !== "ALL").join(", ") } });

  const { context, cookieHeaders } = contextFor(request, params);
  // Browser-facing legacy endpoints use sessionBackend, which resolves the
  // bearer token lazily. Preloading it here avoids a second Convex round-trip
  // on every component endpoint while keeping API-key routes self-contained.
  if (!isDemoMode(context.locals) && !pathname.startsWith("/api/v1/") && !pathname.startsWith("/api/auth/")) {
    const session = await getAuthSession(context);
    if (session) {
      context.locals.user = session.user;
      context.locals.authToken = session.token;
    }
  }

  const response = await handler(context);
  return adaptResponse(response, cookieHeaders);
}

type RouteProps = { params: Promise<{ path?: string[] }> };
export async function GET(request: Request, props: RouteProps) { return dispatch(request, await props.params); }
export async function POST(request: Request, props: RouteProps) { return dispatch(request, await props.params); }
export async function PUT(request: Request, props: RouteProps) { return dispatch(request, await props.params); }
export async function PATCH(request: Request, props: RouteProps) { return dispatch(request, await props.params); }
export async function DELETE(request: Request, props: RouteProps) { return dispatch(request, await props.params); }
