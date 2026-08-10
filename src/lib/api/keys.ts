/**
 * API key generation and hashing.
 *
 * Uses WebCrypto only (no node:crypto) so it runs unchanged on Cloudflare
 * Workers, in `next dev`, and in the key-minting CLI script.
 */

export const KEY_PREFIX = "erp_sk_";

/** Scopes a key can hold. `read` covers GET, `write` covers everything else. */
export const SCOPES = ["read", "write"] as const;
export type Scope = (typeof SCOPES)[number];

/**
 * Mints a new secret. The plaintext is returned once and never stored; only the
 * hash goes to the database.
 */
export function generateApiKey(): { key: string; prefix: string } {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const secret = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const key = `${KEY_PREFIX}${secret}`;
    // Enough to recognise a key in a list, far too little to reconstruct it.
    return { key, prefix: key.slice(0, KEY_PREFIX.length + 6) };
}

export async function hashApiKey(key: string): Promise<string> {
    const data = new TextEncoder().encode(key);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Extracts an ERP key from the machine-facing auth headers.
 *
 * The browser also sends its Convex Auth JWT as `Authorization: Bearer ...`
 * when it calls `/api/v1/*`. Only the ERP prefix can identify a Bearer value
 * as an API key; otherwise that header must be left for session auth.
 * `X-API-Key` is unambiguous and is therefore accepted as-is.
 */
export function extractApiKey(request: Request): string | null {
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
        const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
        const candidate = match?.[1].trim();
        if (candidate?.startsWith(KEY_PREFIX)) return candidate;
    }

    const headerKey = request.headers.get("x-api-key");
    if (headerKey) return headerKey.trim();

    return null;
}
