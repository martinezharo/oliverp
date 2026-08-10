/**
 * Runtime environment access.
 *
 * Cloudflare exposes bindings on `locals.runtime.env`, while local Next runs
 * expose them through `process.env`. Keeping this in one helper lets the
 * Convex gateway work in both environments.
 */
import type { ServerLocals } from "../server-context";

function readEnv(locals: ServerLocals | undefined, name: string): string | undefined {
    const runtimeValue = locals?.runtime?.env?.[name];
    if (typeof runtimeValue === "string" && runtimeValue) return runtimeValue;

    const processValue = typeof process !== "undefined" ? process.env[name] : undefined;
    return processValue || undefined;
}

/** Reads the first configured value, so a preferred variable can win. */
export function getEnv(locals: ServerLocals | undefined, ...names: string[]): string | undefined {
    for (const name of names) {
        const value = readEnv(locals, name);
        if (value) return value;
    }
    return undefined;
}
