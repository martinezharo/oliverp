/**
 * Runtime environment access.
 *
 * Cloudflare exposes bindings on `locals.runtime.env`, while local Node/Astro
 * runs expose them through `import.meta.env` or `process.env`. Keeping this in
 * one helper lets the Convex gateway work in both environments.
 */
function readEnv(locals: App.Locals | undefined, name: string): string | undefined {
    const runtimeEnv = (locals as any)?.runtime?.env;
    if (runtimeEnv && typeof runtimeEnv[name] === "string" && runtimeEnv[name]) {
        return runtimeEnv[name];
    }

    const metaValue = (import.meta.env as Record<string, unknown>)[name];
    if (typeof metaValue === "string" && metaValue) {
        return metaValue;
    }

    if (typeof process !== "undefined" && process.env && process.env[name]) {
        return process.env[name];
    }

    return undefined;
}

/** Reads the first configured value, so a preferred variable can win. */
export function getEnv(locals: App.Locals | undefined, ...names: string[]): string | undefined {
    for (const name of names) {
        const value = readEnv(locals, name);
        if (value) return value;
    }
    return undefined;
}
