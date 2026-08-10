/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const SECRET = "critical-workflows-test-secret";
const actor = {
  kind: "api_key" as const,
  projectLegacyId: 7,
  apiKeyId: "critical-test-key",
};

async function seed(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const projectId = await ctx.db.insert("projects", {
      legacyId: 7,
      name: "Critical workflow project",
      active: true,
    });
    const productId = await ctx.db.insert("products", {
      legacyId: 11,
      projectId,
      projectLegacyId: 7,
      name: "Test product",
    });
    return { projectId, productId };
  });
}

function args(overrides: Record<string, unknown> = {}) {
  return {
    bridgeSecret: SECRET,
    actor,
    projectLegacyId: 7,
    date: "2026-08-10T00:00:00",
    items: [{ productId: 11, units: 2, unitPrice: 8, vatRate: 21 }],
    ...overrides,
  };
}

beforeEach(() => {
  process.env.CONVEX_BRIDGE_SECRET = SECRET;
});

describe("critical inventory workflows", () => {
  it("creates a sale, links its stock movement, and updates the stock read model", async () => {
    const t = convexTest(schema, modules);
    await seed(t);

    const saleId = await t.mutation(api.domain.createSale, {
      ...args(),
      channel: "Web",
      status: "enviada",
    });

    const sale = await t.query(api.domain.getSale, {
      bridgeSecret: SECRET,
      actor,
      legacyId: saleId,
    });
    expect(sale).toMatchObject({
      id: saleId,
      canal: "Web",
      estado: "enviada",
      venta_detalle: [{ producto_id: 11, unidades: 2, precio_unitario_venta: 8 }],
    });

    const stock = await t.query(api.domain.getStockForProduct, {
      bridgeSecret: SECRET,
      actor,
      projectLegacyId: 7,
      productLegacyId: 11,
    });
    expect(stock?.stock_actual).toBe(-2);

    const movements = await t.run(async (ctx) => await ctx.db.query("stockMovements").collect());
    expect(movements).toEqual([
      expect.objectContaining({ units: -2, type: "venta", saleLineId: expect.any(String) }),
    ]);
  });

  it("does not add pending purchases to stock until they are received", async () => {
    const t = convexTest(schema, modules);
    await seed(t);

    const purchaseId = await t.mutation(api.domain.createPurchase, {
      ...args({
        items: [{ productId: 11, units: 4, unitPrice: 3.5, vatRate: 21 }],
      }),
      status: "pendiente",
    });

    expect((await t.query(api.domain.getStockForProduct, {
      bridgeSecret: SECRET,
      actor,
      projectLegacyId: 7,
      productLegacyId: 11,
    }))?.stock_actual).toBe(0);
    expect(await t.run(async (ctx) => await ctx.db.query("stockMovements").collect())).toEqual([]);

    await t.mutation(api.domain.updatePurchase, {
      bridgeSecret: SECRET,
      actor,
      legacyId: purchaseId,
      status: "recibida",
    });

    expect((await t.query(api.domain.getStockForProduct, {
      bridgeSecret: SECRET,
      actor,
      projectLegacyId: 7,
      productLegacyId: 11,
    }))?.stock_actual).toBe(4);
    expect(await t.run(async (ctx) => await ctx.db.query("stockMovements").collect())).toEqual([
      expect.objectContaining({ units: 4, type: "compra" }),
    ]);

    await t.mutation(api.domain.updatePurchase, {
      bridgeSecret: SECRET,
      actor,
      legacyId: purchaseId,
      status: "cancelada",
    });
    expect((await t.query(api.domain.getStockForProduct, {
      bridgeSecret: SECRET,
      actor,
      projectLegacyId: 7,
      productLegacyId: 11,
    }))?.stock_actual).toBe(0);
    expect(await t.run(async (ctx) => await ctx.db.query("stockMovements").collect())).toEqual([]);
  });

  it("records signed manual adjustments and rejects zero", async () => {
    const t = convexTest(schema, modules);
    await seed(t);

    await t.mutation(api.domain.adjustStock, {
      bridgeSecret: SECRET,
      actor,
      projectLegacyId: 7,
      productLegacyId: 11,
      units: 5,
      date: "2026-08-10T00:00:00",
    });
    await t.mutation(api.domain.adjustStock, {
      bridgeSecret: SECRET,
      actor,
      projectLegacyId: 7,
      productLegacyId: 11,
      units: -2,
      date: "2026-08-11T00:00:00",
    });

    const movements = await t.query(api.domain.listStockMovements, {
      bridgeSecret: SECRET,
      actor,
      projectLegacyId: 7,
      productLegacyId: 11,
    });
    expect(movements.map((movement) => movement.unidades)).toEqual([-2, 5]);
    expect(movements.every((movement) => movement.tipo === "ajuste manual")).toBe(true);

    await expect(t.mutation(api.domain.adjustStock, {
      bridgeSecret: SECRET,
      actor,
      projectLegacyId: 7,
      productLegacyId: 11,
      units: 0,
      date: "2026-08-12T00:00:00",
    })).rejects.toThrow("non-zero integer");
  });
});
