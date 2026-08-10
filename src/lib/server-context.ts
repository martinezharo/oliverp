import type { AuthUser } from "./auth";

export interface ServerLocals {
  demoMode?: boolean;
  user?: AuthUser;
  authToken?: string;
  runtime?: { env?: Record<string, unknown> };
  [key: string]: unknown;
}

export interface CookieOptions {
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: "strict" | "lax" | "none";
  secure?: boolean;
  expires?: Date;
}

export interface CookieStore {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options?: CookieOptions): void;
  delete(name: string, options?: CookieOptions): void;
}

/** Small request shape shared by the legacy API modules and Next route adapter. */
export interface ServerContext {
  request: Request;
  url: URL;
  params: Record<string, string | undefined>;
  locals: ServerLocals;
  cookies: CookieStore;
  redirect(path: string, status?: 301 | 302 | 303 | 307 | 308): Response;
}

/** Compatibility type used by the API modules while they are served by Next. */
export type APIRoute = (context: ServerContext) => Response | Promise<Response>;
