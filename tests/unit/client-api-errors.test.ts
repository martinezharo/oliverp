import { afterEach, describe, expect, it, vi } from "vitest";
import { getTranslator } from "../../src/i18n/t";
import { ApiRequestError, apiErrorMessage, apiJson } from "../../src/lib/client-api";
import { paginacionSchema } from "../../src/lib/api/schemas";

const { t } = getTranslator("en");

function respondWith(body: unknown, status: number) {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    })));
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("client API errors", () => {
    it("keeps the error code so the UI can translate it", async () => {
        respondWith(
            { error: { code: "validation_error", message: "El cuerpo de la peticion no es valido." } },
            400,
        );

        const failure = await apiJson("/api/v1/stock").catch((cause: unknown) => cause);

        expect(failure).toBeInstanceOf(ApiRequestError);
        expect((failure as ApiRequestError).code).toBe("validation_error");
        expect((failure as ApiRequestError).status).toBe(400);
    });

    it("renders a known code in the UI language instead of the API's Spanish message", () => {
        const failure = new ApiRequestError("El cuerpo de la peticion no es valido.", 400, "validation_error");

        expect(apiErrorMessage(t, failure, "fallback")).toBe("The request was not valid.");
    });

    it("falls back to the raw message for an unknown code", () => {
        const failure = new ApiRequestError("Something specific", 500, "brand_new_code");

        expect(apiErrorMessage(t, failure, "fallback")).toBe("Something specific");
        expect(apiErrorMessage(t, {}, "fallback")).toBe("fallback");
    });

    it("caps page_size at 100, which is why the UI pages through the inventory", () => {
        expect(paginacionSchema.safeParse({ page_size: "1000" }).success).toBe(false);
        expect(paginacionSchema.safeParse({ page_size: "100" }).success).toBe(true);
    });
});
