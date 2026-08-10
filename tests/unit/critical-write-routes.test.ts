import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  backend: {
    createSale: vi.fn(),
    updateSale: vi.fn(),
    createPurchase: vi.fn(),
    updatePurchase: vi.fn(),
    updateTransaction: vi.fn(),
    getProductGlobal: vi.fn(),
    adjustStock: vi.fn(),
  },
  sessionBackend: vi.fn(),
}));

vi.mock("../../src/lib/runtime", () => ({ isDemoMode: () => false }));
vi.mock("../../src/lib/legacy-api", () => ({
  backendError: (error: unknown) => new Response(JSON.stringify({ error }), { status: 500 }),
  demoResponse: () => new Response(JSON.stringify({ error: "demo" }), { status: 403 }),
  jsonResponse: (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  }),
  parsePositiveInteger: (value: unknown) => {
    const parsed = typeof value === "string" ? Number(value) : value;
    return typeof parsed === "number" && Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  },
  sessionBackend: mocks.sessionBackend,
  unauthorizedResponse: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
}));

const { POST: createSale } = await import("../../src/internal/api/sales/create");
const { PUT: updateSale } = await import("../../src/internal/api/sales/update");
const { POST: createPurchase } = await import("../../src/internal/api/purchases/create");
const { PUT: updatePurchase } = await import("../../src/internal/api/purchases/update");
const { PUT: updateTransaction } = await import("../../src/internal/api/transactions/save");
const { POST: adjustStock } = await import("../../src/internal/api/stock/adjust");

function context(body: unknown) {
  return {
    locals: {},
    request: new Request("https://erp.test/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sessionBackend.mockResolvedValue({ backend: mocks.backend, userId: "user-1" });
  mocks.backend.createSale.mockResolvedValue(17);
  mocks.backend.updateSale.mockResolvedValue(17);
  mocks.backend.createPurchase.mockResolvedValue(18);
  mocks.backend.updatePurchase.mockResolvedValue(18);
  mocks.backend.updateTransaction.mockResolvedValue(19);
  mocks.backend.getProductGlobal.mockResolvedValue({ id: 11, proyecto_id: 7, nombre: "Test product" });
  mocks.backend.adjustStock.mockResolvedValue({ id: 19 });
});

describe("browser write routes", () => {
  it("maps the sale form payload to the Convex sale contract", async () => {
    const response = await createSale(context({
      projectId: 7,
      date: "2026-08-10",
      channel: "Web",
      items: [{ productId: 11, units: 2, price: 8.5, tax: 10 }],
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, id: 17 });
    expect(mocks.backend.createSale).toHaveBeenCalledWith({
      projectId: 7,
      date: "2026-08-10",
      channel: "Web",
      status: "enviada",
      items: [{ productId: 11, units: 2, unitPrice: 8.5, vatRate: 10 }],
    });
  });

  it("preserves a pending purchase status while mapping unitPrice and VAT", async () => {
    const response = await createPurchase(context({
      projectId: 7,
      date: "2026-08-10",
      estado: "pendiente",
      items: [{ productId: 11, units: 4, unitPrice: 3.5, tax: 21 }],
    }));

    expect(response.status).toBe(200);
    expect(mocks.backend.createPurchase).toHaveBeenCalledWith({
      projectId: 7,
      date: "2026-08-10",
      status: "pendiente",
      items: [{ productId: 11, units: 4, unitPrice: 3.5, vatRate: 21 }],
    });
  });

  it("looks up the product project before recording a signed stock adjustment", async () => {
    const response = await adjustStock(context({
      productId: 11,
      units: -2,
      date: "2026-08-10",
    }));

    expect(response.status).toBe(200);
    expect(mocks.backend.getProductGlobal).toHaveBeenCalledWith(11);
    expect(mocks.backend.adjustStock).toHaveBeenCalledWith({
      projectId: 7,
      productId: 11,
      units: -2,
      date: "2026-08-10",
    });
  });

  it("rejects an incomplete sale before invoking the backend", async () => {
    const response = await createSale(context({ projectId: 7, date: "2026-08-10", items: [] }));

    expect(response.status).toBe(400);
    expect(mocks.backend.createSale).not.toHaveBeenCalled();
  });

  it("maps an edited sale to the update contract and keeps its id", async () => {
    const response = await updateSale(context({
      id: "17",
      projectId: "7",
      date: "2026-08-11",
      channel: "Web",
      items: [{ productId: 11, units: 1, price: 9, tax: 21 }],
    }));

    expect(response.status).toBe(200);
    expect(mocks.backend.updateSale).toHaveBeenCalledWith(17, {
      date: "2026-08-11",
      channel: "Web",
      items: [{ productId: 11, units: 1, unitPrice: 9, vatRate: 21 }],
    });
  });

  it("maps an edited purchase to the update contract", async () => {
    const response = await updatePurchase(context({
      id: "18",
      projectId: "7",
      date: "2026-08-11",
      estado: "recibida",
      items: [{ productId: 11, units: 3, unitPrice: 4, tax: 10 }],
    }));

    expect(response.status).toBe(200);
    expect(mocks.backend.updatePurchase).toHaveBeenCalledWith(18, {
      date: "2026-08-11",
      status: "recibida",
      items: [{ productId: 11, units: 3, unitPrice: 4, vatRate: 10 }],
    });
  });

  it("maps an edited other transaction to PUT instead of creating a duplicate", async () => {
    const response = await updateTransaction(context({
      id: 19,
      projectId: 7,
      tipo: "gasto",
      fecha: "2026-08-11",
      concepto: "Shipping",
      descripcion: "Updated",
      importe: 4.5,
      porcentaje_iva: 21,
    }));

    expect(response.status).toBe(200);
    expect(mocks.backend.updateTransaction).toHaveBeenCalledWith(19, {
      type: "gasto",
      concept: "Shipping",
      description: "Updated",
      amount: 4.5,
      vatRate: 21,
      date: "2026-08-11",
    });
    expect(mocks.backend.createSale).not.toHaveBeenCalled();
  });

  it("rejects a PUT without an id instead of silently creating a transaction", async () => {
    const response = await updateTransaction(context({
      projectId: 7,
      tipo: "gasto",
      fecha: "2026-08-11",
      concepto: "Shipping",
      importe: 4.5,
    }));

    expect(response.status).toBe(400);
    expect(mocks.backend.updateTransaction).not.toHaveBeenCalled();
  });
});
