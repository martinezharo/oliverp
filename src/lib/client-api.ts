"use client";

import type { Translate } from "@/i18n/t";

import { ApiRequestError } from "./api-error";
import { getAuthToken } from "./authToken";
import { isDemoActive } from "./demo/mode";

export { ApiRequestError };

/**
 * Renders an API failure in the page's language, falling back to `fallback`.
 *
 * `t` is passed in rather than imported: the caller is a component and already
 * has one from `useT()`, and this way an error cannot end up being the one
 * English sentence on a Spanish screen.
 */
export function apiErrorMessage(t: Translate, cause: unknown, fallback: string): string {
  if (cause instanceof ApiRequestError && cause.code) {
    const key = `api.error.${cause.code}`;
    const translated = t(key);
    if (translated !== key) return translated;
  }
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAuthToken();
  if (token && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: "same-origin",
  });
}

export async function apiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  // Demo mode has no backend to call: the same request is answered from the
  // sample business held in the tab. The module is loaded on demand so the
  // login and landing pages, which also use this helper, never download it.
  if (isDemoActive()) {
    const { demoRequest } = await import("./demo/api");
    return demoRequest(input, init) as T;
  }

  const response = await apiFetch(input, init);
  const body = (await response.json().catch(() => null)) as T | { error?: unknown } | null;
  if (!response.ok) {
    const envelope =
      body && typeof body === "object" && body !== null && "error" in body ? body.error : undefined;
    const structured = typeof envelope === "object" && envelope !== null ? envelope as { message?: unknown; code?: unknown } : null;
    const message =
      typeof envelope === "string"
        ? envelope
        : structured && "message" in structured
          ? String(structured.message)
          : `Request failed with ${response.status}`;
    const code = structured && typeof structured.code === "string" ? structured.code : undefined;
    throw new ApiRequestError(message, response.status, code);
  }
  return body as T;
}
