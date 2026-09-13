/**
 * The demo's stand-in for `/api/*`.
 *
 * Every screen talks to the server through `apiJson`, so demo mode answers
 * there rather than in each form: the same components, submitting the same
 * payloads, are served by the in-memory store instead of by the Worker. A
 * saved sale is a real save as far as the dialog that saved it is concerned —
 * it simply lands in a dataset that lives in the tab and nowhere else.
 *
 * The envelopes below are the ones the real endpoints return, and the
 * validation is theirs too, so a demo form fails the same way a live one
 * would rather than silently accepting something the backend would reject.
 */

import { ApiRequestError } from "@/lib/api-error";
import { githubRepository, type ResolvedPlugin } from "@/lib/plugins";

import {
  otherConcepts,
  otherRecord,
  purchaseRecord,
  saleRecord,
  salesInitData,
  stockMovements,
} from "./domain";
import * as store from "./store";

type Body = Record<string, unknown>;

function fail(message: string, status: number, code: string): never {
  throw new ApiRequestError(message, status, code);
}

// Declared rather than assigned to a const: TypeScript only narrows the code
// after a `never`-returning call when it can see the declaration.
function invalid(message: string): never {
  fail(message, 400, "validation_error");
}

function missing(message: string): never {
  fail(message, 404, "not_found");
}

/** Refusals the demo keeps: there is no account behind it to act on. */
function unavailable(): never {
  fail("Not available in demo mode", 403, "demo_mode");
}

function positiveInteger(value: unknown, field: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) invalid(`Missing ${field}`);
  return parsed;
}

function text(value: unknown, field: string): string {
  const parsed = typeof value === "string" ? value.trim() : "";
  if (!parsed) invalid(`Missing ${field}`);
  return parsed;
}

/** The order lines every sale and purchase payload carries, in euros. */
function lines(value: unknown, priceKey: "price" | "unitPrice"): store.LineInput[] {
  if (!Array.isArray(value) || value.length === 0) invalid("Missing items");
  return (value as Body[]).map((item) => ({
    productId: positiveInteger(item.productId, "productId"),
    units: Number(item.units ?? 1),
    unitPrice: Number(item[priceKey] ?? 0),
    vatRate: Number(item.tax ?? 21),
  }));
}

/** A repository's own digest, invented but stable, as GitHub would return. */
function fakeSha(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 0x01000193) >>> 0;
  }
  return Array.from({ length: 5 }, (_, step) =>
    ((hash + step * 0x9e3779b9) >>> 0).toString(16).padStart(8, "0"),
  ).join("");
}

/**
 * A plugin manifest for whatever repository was entered.
 *
 * Nothing is downloaded — the demo has no GitHub App behind it — so the
 * manifest says as much in its description rather than pretending the
 * repository really declared one.
 */
function resolvePlugin(repositoryUrl: unknown): ResolvedPlugin {
  const repository = typeof repositoryUrl === "string" ? githubRepository(repositoryUrl) : null;
  if (!repository) invalid("Enter a valid GitHub repository URL.");
  const id = repository.repo.toLowerCase().replace(/[^a-z0-9.-]+/g, "-").replace(/^-|-$/g, "") || "demo-plugin";
  const name = repository.repo
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return {
    schemaVersion: 1,
    id,
    name,
    description: "Sample manifest produced by demo mode. Nothing was downloaded from GitHub.",
    version: "1.0.0",
    hooks: [{ type: "finance.other_transaction.vat_only", concept: "Marketplace fees" }],
    repositoryUrl: repository.url,
    sourceSha: fakeSha(repository.url),
  };
}

function parseBody(init?: RequestInit): Body {
  if (typeof init?.body !== "string") return {};
  try {
    return JSON.parse(init.body) as Body;
  } catch {
    invalid("A JSON body is required.");
  }
}

/**
 * Answers one request from the in-memory dataset.
 *
 * Returns whatever the endpoint's JSON body would be, or throws the
 * `ApiRequestError` the caller already knows how to render.
 */
export function demoRequest(input: RequestInfo | URL, init?: RequestInit): unknown {
  const base = typeof window === "undefined" ? "http://demo.invalid" : window.location.origin;
  const url = new URL(String(input instanceof Request ? input.url : input), base);
  const method = (init?.method ?? "GET").toUpperCase();
  const query = url.searchParams;
  const body = parseBody(init);
  const dataset = store.demoDataset();

  switch (`${method} ${url.pathname}`) {
    // ── Reads ───────────────────────────────────────────────
    case "GET /api/demo/status":
      return { active: true };

    case "GET /api/sales/init-data":
      return salesInitData(dataset, Number(query.get("projectId")));

    case "GET /api/sales/get": {
      const record = saleRecord(
        dataset,
        positiveInteger(query.get("projectId"), "projectId"),
        positiveInteger(query.get("id"), "id"),
      );
      return record ?? missing("Sale not found");
    }

    case "GET /api/purchases/get": {
      const record = purchaseRecord(
        dataset,
        positiveInteger(query.get("projectId"), "projectId"),
        positiveInteger(query.get("id"), "id"),
      );
      return record ?? missing("Purchase not found");
    }

    case "GET /api/transactions/get-other": {
      const record = otherRecord(
        dataset,
        positiveInteger(query.get("projectId"), "projectId"),
        positiveInteger(query.get("id"), "id"),
      );
      return record ?? missing("Transaction not found");
    }

    case "GET /api/transactions/concepts":
      return { concepts: otherConcepts(dataset, positiveInteger(query.get("projectId"), "projectId")) };

    case "GET /api/stock/movements":
      return {
        data: stockMovements(
          dataset,
          positiveInteger(query.get("projectId"), "projectId"),
          positiveInteger(query.get("productId"), "productId"),
        ),
      };

    // ── Operations ──────────────────────────────────────────
    case "POST /api/sales/create":
      return {
        success: true,
        id: store.createSale({
          projectId: positiveInteger(body.projectId, "projectId"),
          date: text(body.date, "date"),
          channel: text(body.channel, "channel"),
          items: lines(body.items, "price"),
        }),
      };

    case "PUT /api/sales/update": {
      const id = positiveInteger(body.id, "id");
      const updated = store.updateSale({
        id,
        projectId: positiveInteger(body.projectId, "projectId"),
        date: text(body.date, "date"),
        channel: text(body.channel, "channel"),
        items: lines(body.items, "price"),
      });
      return updated ? { success: true, id } : missing("Sale not found");
    }

    case "POST /api/purchases/create":
      return {
        success: true,
        id: store.createPurchase({
          projectId: positiveInteger(body.projectId, "projectId"),
          date: text(body.date, "date"),
          items: lines(body.items, "unitPrice"),
        }),
      };

    case "PUT /api/purchases/update": {
      const id = positiveInteger(body.id, "id");
      const updated = store.updatePurchase({
        id,
        projectId: positiveInteger(body.projectId, "projectId"),
        date: text(body.date, "date"),
        items: lines(body.items, "unitPrice"),
      });
      return updated ? { success: true, id } : missing("Purchase not found");
    }

    case "POST /api/transactions/save":
    case "PUT /api/transactions/save": {
      const amount = Number(body.importe);
      if (!Number.isFinite(amount) || amount <= 0) invalid("Missing required fields");
      const vatRate = body.porcentaje_iva === undefined || body.porcentaje_iva === "" ? 0 : Number(body.porcentaje_iva);
      if (!Number.isFinite(vatRate) || vatRate < 0) invalid("Missing required fields");
      const type = body.tipo === "gasto" ? "gasto" : "ingreso";
      const id = store.saveOther({
        projectId: positiveInteger(body.projectId, "projectId"),
        ...(method === "PUT" ? { id: positiveInteger(body.id, "id") } : {}),
        type,
        date: text(body.fecha, "date"),
        concept: text(body.concepto, "concept"),
        description: typeof body.descripcion === "string" ? body.descripcion : null,
        amount,
        vatRate,
      });
      return { success: true, id };
    }

    case "DELETE /api/transactions/delete": {
      const type = query.get("type");
      if (!type) invalid("Missing id or type");
      return {
        success: store.deleteTransaction(
          positiveInteger(query.get("projectId"), "projectId"),
          positiveInteger(query.get("id"), "id"),
          type,
        ),
      };
    }

    // ── Catalogue, projects, keys, plugins ──────────────────
    case "POST /api/products/create":
      return {
        success: true,
        data: store.createProduct(
          positiveInteger(body.projectId, "projectId"),
          text(body.name, "name"),
        ),
      };

    case "POST /api/stock/adjust": {
      const units = Number(body.units);
      if (!Number.isInteger(units) || units === 0) {
        invalid("Stock adjustment must be a non-zero integer.");
      }
      return {
        success: true,
        data: store.adjustStock({
          projectId: positiveInteger(body.projectId, "projectId"),
          productId: positiveInteger(body.productId, "productId"),
          units,
          date: text(body.date, "date"),
        }),
      };
    }

    case "POST /api/projects/create": {
      const project = store.createProject(text(body.name, "name"));
      return { success: true, data: { id: project.id, nombre: project.name, activo: true } };
    }

    case "POST /api/projects/delete": {
      const deleted = store.deleteProject(positiveInteger(body.projectId, "projectId"));
      return deleted ? { success: true } : missing("Project not found");
    }

    case "POST /api/keys/create": {
      const scopes = Array.isArray(body.scopes) && body.scopes.includes("write")
        ? (["read", "write"] as const)
        : (["read"] as const);
      const name = text(body.name, "name");
      if (name.length > 60) invalid("Invalid name");
      const expiresAt = typeof body.expiresAt === "string" && body.expiresAt.trim() !== ""
        ? new Date(body.expiresAt).toISOString()
        : undefined;
      const minted = store.createApiKey({
        projectId: positiveInteger(body.projectId, "projectId"),
        name,
        scopes: [...scopes],
        ...(expiresAt ? { expiresAt } : {}),
      });
      return { success: true, data: { ...minted.row, key: minted.key } };
    }

    case "POST /api/keys/revoke": {
      const revoked = store.revokeApiKey(text(body.keyId, "keyId"));
      return revoked ? { success: true } : missing("Key not found");
    }

    case "POST /api/plugins/resolve":
      return resolvePlugin(body.repositoryUrl);

    // Deleting the account, and signing out of one, mean nothing here: the
    // demo has no account. Leaving it is the amber button in the header.
    case "POST /api/account/delete":
      return unavailable();

    default:
      return missing(`Not available in demo mode: ${url.pathname}`);
  }
}
