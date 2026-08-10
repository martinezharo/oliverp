import { createBackend, type BackendClient } from "../convex";
import { getAuthSession } from "../auth";
import { isDemoMode } from "../runtime";
import { ApiError } from "./errors";
import { extractApiKey, hashApiKey, type Scope } from "./keys";
import type { ServerContext } from "../server-context";

/** Who is making a request to the machine-facing API. */
export interface Principal {
    kind: "api_key" | "session";
    scopes: Scope[];
    /** Pinned project, or null when the caller may act on any project. */
    projectId: number | null;
    apiKeyId: string | null;
    /** Stable private namespace used to isolate idempotency records per caller. */
    idempotencyNamespace: string;
    backend: BackendClient;
}

const LAST_USED_THROTTLE_MS = 60_000;

async function resolveConvexApiKey(context: ServerContext, rawKey: string): Promise<Principal> {
    const keyHash = await hashApiKey(rawKey);
    const lookup = createBackend(context.locals, { kind: "api_key" });
    const apiKey = await lookup.apiKeyByHash(keyHash);

    // Unknown, revoked and expired keys intentionally share one response.
    if (!apiKey || !apiKey.activa) {
        throw new ApiError("unauthorized", "API key invalida o revocada.");
    }

    if (apiKey.expira_en && new Date(apiKey.expira_en).getTime() < Date.now()) {
        throw new ApiError("unauthorized", "API key invalida o revocada.");
    }

    const lastUsed = apiKey.ultimo_uso_en ? new Date(apiKey.ultimo_uso_en).getTime() : 0;
    if (Date.now() - lastUsed > LAST_USED_THROTTLE_MS) {
        await lookup.touchApiKey(apiKey.id, new Date().toISOString());
    }

    return {
        kind: "api_key",
        scopes: apiKey.scopes,
        projectId: apiKey.proyecto_id,
        apiKeyId: apiKey.id,
        idempotencyNamespace: `api-key:${apiKey.id}`,
        backend: createBackend(context.locals, {
            kind: "api_key",
            ...(apiKey.proyecto_id !== null ? { projectLegacyId: apiKey.proyecto_id } : {}),
            apiKeyId: apiKey.id,
        }),
    };
}

async function resolveSession(context: ServerContext): Promise<Principal> {
    const session = await getAuthSession(context);
    if (!session) {
        throw new ApiError("unauthorized", "Se requiere autenticacion.", {
            hint: "Envia 'Authorization: Bearer erp_sk_...' o inicia sesion en la interfaz web.",
        });
    }

    return {
        kind: "session",
        scopes: ["read", "write"],
        projectId: null,
        apiKeyId: null,
        idempotencyNamespace: `session:${session.user.id}`,
        backend: createBackend(
            context.locals,
            { kind: "session", userId: session.user.id },
            session.token,
        ),
    };
}

export async function resolvePrincipal(context: ServerContext): Promise<Principal> {
    if (isDemoMode(context.locals)) {
        throw new ApiError("demo_mode", "La API no esta disponible en modo demo.", {
            hint: "Configura Convex para salir del modo demo.",
        });
    }

    const rawKey = extractApiKey(context.request);
    if (rawKey) return resolveConvexApiKey(context, rawKey);
    return resolveSession(context);
}

export function requireScope(principal: Principal, scope: Scope): void {
    if (!principal.scopes.includes(scope)) {
        throw new ApiError("forbidden", `Esta API key no tiene el permiso '${scope}'.`, {
            hint: `Permisos de la key: ${principal.scopes.join(", ") || "(ninguno)"}.`,
        });
    }
}

export function resolveProjectId(principal: Principal, requested: number | null | undefined): number {
    if (principal.projectId !== null) {
        if (requested != null && requested !== principal.projectId) {
            throw new ApiError(
                "forbidden",
                `Esta API key solo puede operar sobre el proyecto ${principal.projectId}.`,
            );
        }
        return principal.projectId;
    }

    if (requested == null) {
        throw new ApiError("validation_error", "Falta 'proyecto_id'.", {
            details: [{ field: "proyecto_id", message: "Requerido para esta API key (no esta fijada a un proyecto)." }],
            hint: "Lista los proyectos disponibles con GET /api/v1/proyectos",
        });
    }

    return requested;
}

/** Convex applies the same check server-side; this remains useful for 404 semantics. */
export function assertProjectAccess(principal: Principal, projectId: number): void {
    if (principal.projectId !== null && principal.projectId !== projectId) {
        throw new ApiError("not_found", "Recurso no encontrado.");
    }
}

export function requireBackend(principal: Principal): BackendClient {
    return principal.backend;
}
