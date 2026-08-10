"use client";

import { ui } from "@/i18n/ui";

import { getAuthToken } from "./authToken";

/**
 * A failed API call, carrying the machine-readable `code` from the error
 * envelope. The `message` stays as the API sent it: the v1 vocabulary is a
 * documented Spanish contract for API clients, so the UI translates by code
 * instead (see `apiErrorMessage`) and never shows that message verbatim.
 */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

/** Renders an API failure in the UI language, falling back to `fallback`. */
export function apiErrorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof ApiRequestError && cause.code) {
    const translated = ui.en[`api.error.${cause.code}`];
    if (translated) return translated;
  }
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
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
