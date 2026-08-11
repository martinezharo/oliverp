/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const SECRET = "plugin-finance-test-secret";
const actor = { kind: "api_key" as const, projectLegacyId: 7, apiKeyId: "plugin-finance-key" };

beforeEach(() => {
  process.env.CONVEX_BRIDGE_SECRET = SECRET;
});

describe("finance behavior hooks", () => {
  it("reproduces the legacy solo_iva rule without changing other concepts", async () => {
    const t = convexTest(schema, modules);
    const { installationId } = await t.run(async (ctx) => {
      const projectId = await ctx.db.insert("projects", { legacyId: 7, name: "Hook project", active: true });
      const rows = [
        { legacyId: 1, type: "gasto" as const, concept: "solo_iva", amountCents: 12_100, vatRate: 21 },
        { legacyId: 2, type: "ingreso" as const, concept: "solo_iva", amountCents: 24_200, vatRate: 21 },
        { legacyId: 3, type: "gasto" as const, concept: "Publicidad", amountCents: 5_000, vatRate: 0 },
        { legacyId: 4, type: "gasto" as const, concept: "solo iva", amountCents: 1_000, vatRate: 21 },
      ];
      for (const row of rows) {
        await ctx.db.insert("otherTransactions", {
          ...row,
          projectId,
          projectLegacyId: 7,
          date: "2026-08-11T00:00:00.000Z",
        });
      }
      const installationId = await ctx.db.insert("pluginInstallations", {
        projectId,
        projectLegacyId: 7,
        pluginId: "com.4oli.solo-iva",
        name: "Solo IVA",
        description: "Legacy VAT-only concept rule",
        version: "4.0.0",
        repositoryUrl: "https://github.com/martinezharo/oliverp-plugin-solo-iva",
        sourceSha: "0123456789abcdef0123456789abcdef01234567",
        hooks: [{ type: "finance.other_transaction.vat_only", concept: "solo_iva" }],
        enabled: false,
        installedBy: "admin",
        installedAt: new Date(0).toISOString(),
      });
      return { installationId };
    });

    const query = () => t.query(api.domain.listDailyFinances, {
      bridgeSecret: SECRET,
      actor,
      projectLegacyId: 7,
    });

    await expect(query()).resolves.toMatchObject([{
      ingresos: 242,
      gastos: 181,
      balance: 61,
      urp: -181,
      iva_soportado: 22.74,
      iva_repercutido: 42,
      saldo_iva: 19.26,
    }]);

    await t.run(async (ctx) => ctx.db.patch(installationId, { enabled: true }));
    await expect(query()).resolves.toMatchObject([{
      ingresos: 0,
      gastos: 60,
      balance: -60,
      urp: -60,
      iva_soportado: 22.74,
      iva_repercutido: 42,
      saldo_iva: 19.26,
    }]);
  });
});
