import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { demoRequest } from "../../src/lib/demo/api";
import {
  evolutionSeries,
  financeRows,
  stockRows,
  transactionSources,
} from "../../src/lib/demo/domain";
import { buildDataset } from "../../src/lib/demo/seed";
import {
  createSale,
  demoDataset,
  deleteTransaction,
  resetDemo,
  setPluginEnabled,
} from "../../src/lib/demo/store";
import { normalizeTransactions } from "../../src/lib/transactions";

/**
 * The demo is rendered twice — once by the Worker and once by the browser
 * hydrating what it sent — and the two have to agree exactly, or React throws
 * the page away and rebuilds it. The sample business therefore depends on one
 * input and one only: the UTC day its history ends on. Half of what is tested
 * here is that sameness; the other half is that the numbers a screen shows
 * really follow from the records, so recording an operation moves them.
 */

const noon = new Date("2026-03-15T12:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(noon);
  resetDemo();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("the sample business", () => {
  it("is identical at any hour and in any timezone", () => {
    vi.setSystemTime(new Date("2026-03-15T00:00:01.000Z"));
    const justAfterMidnight = buildDataset("2026-03-15");

    // 22:30 UTC is already tomorrow in Madrid: the dates must not move with
    // the reader's clock.
    vi.setSystemTime(new Date("2026-03-15T22:30:00.000Z"));
    expect(buildDataset("2026-03-15")).toEqual(justAfterMidnight);
  });

  it("hands back the identical object within one day, and rebuilds after it", () => {
    // The same array, not merely an equal one: every view memoises its
    // derivations on this object.
    expect(demoDataset()).toBe(demoDataset());
    expect(demoDataset().day).toBe("2026-03-15");

    vi.setSystemTime(new Date("2026-03-16T09:00:00.000Z"));
    expect(demoDataset().day).toBe("2026-03-16");
  });

  it("gives both projects a traded history", () => {
    const dataset = demoDataset();
    expect(dataset.projects).toHaveLength(2);

    for (const project of dataset.projects) {
      expect(dataset.products.filter((row) => row.projectId === project.id).length).toBeGreaterThan(4);
      expect(dataset.sales.filter((row) => row.projectId === project.id).length).toBeGreaterThan(100);
      expect(dataset.purchases.filter((row) => row.projectId === project.id).length).toBeGreaterThan(5);
      expect(dataset.others.filter((row) => row.projectId === project.id).length).toBeGreaterThan(5);
      expect(financeRows(dataset, project.id).length).toBeGreaterThan(60);
    }
  });

  it("never sells stock it does not have", () => {
    const dataset = demoDataset();
    for (const project of dataset.projects) {
      for (const row of stockRows(dataset, project.id)) {
        expect(row.stock_actual).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("ends the history today and asks for one chart point per day", () => {
    const series = evolutionSeries(demoDataset(), 1, 30);
    expect(series).toHaveLength(31);
    expect(new Set(series.map((point) => point.date)).size).toBe(series.length);
    expect(series.at(-1)?.date).toBe("2026-03-15");
    expect(series[0].date).toBe("2026-02-13");
  });
});

describe("recording operations", () => {
  it("moves the day's income, the stock and the transaction list at once", () => {
    const before = financeRows(demoDataset(), 1).find((row) => row.dia === "2026-03-15");
    const stockBefore = stockRows(demoDataset(), 1).find((row) => row.producto_id === 1);

    const id = createSale({
      projectId: 1,
      date: "2026-03-15",
      channel: "Online store",
      items: [{ productId: 1, units: 3, unitPrice: 10, vatRate: 21 }],
    });

    const after = financeRows(demoDataset(), 1).find((row) => row.dia === "2026-03-15");
    expect((after?.ingresos ?? 0) - (before?.ingresos ?? 0)).toBeCloseTo(30, 2);

    const stockAfter = stockRows(demoDataset(), 1).find((row) => row.producto_id === 1);
    expect((stockBefore?.stock_actual ?? 0) - (stockAfter?.stock_actual ?? 0)).toBe(3);

    const listed = normalizeTransactions(transactionSources(demoDataset(), 1));
    expect(listed.some((row) => row.type === "venta" && row.id === id)).toBe(true);

    // And deleting it puts everything back.
    expect(deleteTransaction(1, id, "venta")).toBe(true);
    expect(financeRows(demoDataset(), 1).find((row) => row.dia === "2026-03-15")?.ingresos)
      .toBeCloseTo(before?.ingresos ?? 0, 2);
  });

  it("honours an enabled vat_only plugin the way the backend does", () => {
    const fees = demoDataset().others.filter((row) => row.projectId === 1 && row.concept === "Marketplace fees");
    expect(fees.length).toBeGreaterThan(0);
    const day = fees[0].date;
    const withPlugin = financeRows(demoDataset(), 1).find((row) => row.dia === day);

    setPluginEnabled(1, "marketplace-fee-vat", false);
    const withoutPlugin = financeRows(demoDataset(), 1).find((row) => row.dia === day);

    // Disabled, the fee counts as an expense again; its VAT was always claimed.
    expect(withoutPlugin?.gastos ?? 0).toBeGreaterThan(withPlugin?.gastos ?? 0);
    expect(withoutPlugin?.iva_soportado).toBeCloseTo(withPlugin?.iva_soportado ?? 0, 2);
  });
});

describe("the demo answering for the API", () => {
  it("serves the forms what the real endpoints would", () => {
    const init = demoRequest("/api/sales/init-data?projectId=1") as {
      products: Array<{ id: number; name: string; price: number }>;
      channels: string[];
    };
    expect(init.products.length).toBeGreaterThan(4);
    expect(init.channels).toContain("Online store");

    const concepts = demoRequest("/api/transactions/concepts?projectId=1") as { concepts: string[] };
    expect(concepts.concepts).toContain("Marketplace fees");

    const movements = demoRequest("/api/stock/movements?projectId=1&productId=1") as { data: unknown[] };
    expect(movements.data.length).toBeGreaterThan(10);
  });

  it("saves an entry, reads it back and deletes it", () => {
    const saved = demoRequest("/api/transactions/save", {
      method: "POST",
      body: JSON.stringify({
        projectId: 1,
        tipo: "gasto",
        fecha: "2026-03-14",
        concepto: "Courier claim",
        importe: 42.5,
        porcentaje_iva: 21,
      }),
    }) as { success: boolean; id: number };
    expect(saved.success).toBe(true);

    const record = demoRequest(`/api/transactions/get-other?id=${saved.id}&projectId=1`) as {
      concepto: string;
      importe: number;
    };
    expect(record).toMatchObject({ concepto: "Courier claim", importe: 42.5 });

    const deleted = demoRequest(
      `/api/transactions/delete?id=${saved.id}&projectId=1&type=gasto`,
      { method: "DELETE" },
    ) as { success: boolean };
    expect(deleted.success).toBe(true);
  });

  it("reads an operation back into its form and saves the changes", () => {
    const created = demoRequest("/api/sales/create", {
      method: "POST",
      body: JSON.stringify({
        projectId: 1,
        date: "2026-03-15",
        channel: "Farmers market",
        items: [{ productId: 1, units: 2, price: 11, tax: 21 }],
      }),
    }) as { id: number };

    const record = demoRequest(`/api/sales/get?id=${created.id}&projectId=1`) as {
      canal: string;
      venta_detalle: Array<{ producto_id: number; unidades: number; precio_unitario_venta: number }>;
    };
    expect(record.canal).toBe("Farmers market");
    expect(record.venta_detalle).toEqual([
      expect.objectContaining({ producto_id: 1, unidades: 2, precio_unitario_venta: 11 }),
    ]);

    demoRequest("/api/sales/update", {
      method: "PUT",
      body: JSON.stringify({
        id: created.id,
        projectId: 1,
        date: "2026-03-15",
        channel: "Amazon",
        items: [{ productId: 1, units: 5, price: 11, tax: 21 }],
      }),
    });

    const listed = normalizeTransactions(transactionSources(demoDataset(), 1))
      .find((row) => row.type === "venta" && row.id === created.id);
    expect(listed).toMatchObject({ channel: "Amazon", units: 5, amount: 55 });
  });

  it("rejects what the real endpoints reject", () => {
    expect(() => demoRequest("/api/sales/create", {
      method: "POST",
      body: JSON.stringify({ projectId: 1, date: "2026-03-15", channel: "Online store", items: [] }),
    })).toThrowError(/Missing items/);

    expect(() => demoRequest("/api/stock/adjust", {
      method: "POST",
      body: JSON.stringify({ projectId: 1, productId: 1, units: 0, date: "2026-03-15" }),
    })).toThrowError(/non-zero integer/);

    // There is no account behind the demo, so this one stays refused.
    expect(() => demoRequest("/api/account/delete", { method: "POST" })).toThrowError(/demo mode/);
  });
});
