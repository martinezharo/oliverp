import type { ZodError } from "zod";

/**
 * Every error the v1 API returns uses one shape:
 *
 *   { "error": { "code", "message", "details"?, "hint"? } }
 *
 * The `code` is a stable machine-readable slug, `message` explains the problem
 * in plain language, and `hint` tells the caller what to do about it. That last
 * field matters more than it looks: an LLM that gets "estado invalido" retries
 * blindly, while one that gets the list of accepted values fixes the call.
 */
export type ApiErrorCode =
    | "validation_error"
    | "unauthorized"
    | "forbidden"
    | "not_found"
    | "conflict"
    | "idempotency_mismatch"
    | "demo_mode"
    | "not_configured"
    | "internal_error";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
    validation_error: 400,
    unauthorized: 401,
    forbidden: 403,
    not_found: 404,
    conflict: 409,
    idempotency_mismatch: 422,
    demo_mode: 403,
    not_configured: 503,
    internal_error: 500,
};

export interface ApiErrorDetail {
    field: string;
    message: string;
    /** Accepted values or format, when the field is constrained. */
    expected?: string;
}

export class ApiError extends Error {
    readonly code: ApiErrorCode;
    readonly details?: ApiErrorDetail[];
    readonly hint?: string;

    constructor(
        code: ApiErrorCode,
        message: string,
        options: { details?: ApiErrorDetail[]; hint?: string } = {},
    ) {
        super(message);
        this.name = "ApiError";
        this.code = code;
        this.details = options.details;
        this.hint = options.hint;
    }

    get status(): number {
        return STATUS_BY_CODE[this.code];
    }

    toResponse(extraHeaders: Record<string, string> = {}): Response {
        const publicMessage = this.code === "internal_error"
            ? "Se produjo un error interno."
            : this.message;
        return new Response(
            JSON.stringify({
                error: {
                    code: this.code,
                    message: publicMessage,
                    ...(this.details ? { details: this.details } : {}),
                    ...(this.hint ? { hint: this.hint } : {}),
                },
            }),
            {
                status: this.status,
                headers: { "Content-Type": "application/json", ...extraHeaders },
            },
        );
    }
}

/** Converts a ConvexError raised by the domain layer into the public API shape. */
export function fromConvexError(error: unknown): ApiError | null {
    const data = (error as { data?: unknown } | null)?.data;
    const candidate = data && typeof data === "object"
        ? data as { code?: unknown; message?: unknown }
        : null;
    const rawCode = candidate?.code;
    const message = candidate?.message;
    const knownCodes: ApiErrorCode[] = [
        "validation_error",
        "unauthorized",
        "forbidden",
        "not_found",
        "conflict",
        "idempotency_mismatch",
        "demo_mode",
        "not_configured",
        "internal_error",
    ];

    if (typeof rawCode === "string" && typeof message === "string") {
        const code = knownCodes.includes(rawCode as ApiErrorCode)
            ? rawCode as ApiErrorCode
            : "internal_error";
        return new ApiError(code, message);
    }

    return null;
}

/**
 * Turns a Zod failure into per-field details. Paths are dotted so an agent can
 * map them straight back onto the JSON body it sent (`items.0.unidades`).
 */
export function fromZodError(error: ZodError): ApiError {
    const details: ApiErrorDetail[] = error.issues.map((issue) => {
        const field = issue.path.length > 0 ? issue.path.join(".") : "(body)";
        const detail: ApiErrorDetail = { field, message: issue.message };

        // Enum mismatches are the most common agent mistake, and the fix is
        // always "use one of these", so spell the options out.
        if (issue.code === "invalid_value" && "values" in issue) {
            const values = (issue as { values?: readonly unknown[] }).values;
            if (values?.length) {
                detail.expected = values.map((v) => JSON.stringify(v)).join(" | ");
            }
        }

        return detail;
    });

    return new ApiError("validation_error", "El cuerpo de la peticion no es valido.", {
        details,
        hint: "Revisa los campos listados en 'details'. El esquema completo esta en GET /api/v1/openapi.json",
    });
}
