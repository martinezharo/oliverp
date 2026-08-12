import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { assertBridgeSecret, fail, productByLegacyId, projectByLegacyId } from "./lib/bridge";
import type { MutationCtx } from "./_generated/server";

/**
 * One-shot import surface for the legacy data migration.
 *
 * These are `internal*` functions: they are not part of the deployment's
 * public API and cannot be reached with the bridge secret alone. Run them from
 * a trusted shell with `pnpm exec convex run migration:importProjects '{...}'`.
 * They can rewrite any row and reassign project membership, so remote
 * reachability was the wrong default once the deployment stopped being
 * single-tenant.
 *
 * The data migration is complete and its driver script has been removed along
 * with the rest of the legacy database tooling. These functions are kept because
 * they document the shape of the imported rows and can still be replayed by
 * hand. Each operation is idempotent by legacy id and expects small batches, so
 * a replay stays below Convex's argument and transaction limits.
 *
 * This is deliberately separate from the application domain mutations: source
 * rows already contain their identity and must not receive new sequence ids.
 */

const importArgs = {
  bridgeSecret: v.string(),
  rows: v.array(v.any()),
};

const pluginHook = v.object({
  type: v.literal("finance.other_transaction.vat_only"),
  concept: v.string(),
});

function numberValue(value: unknown, fallback = 0): number {
  const result = typeof value === "number" ? value : Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
}

function centsValue(value: unknown): number {
  return Math.round(numberValue(value) * 100);
}

function dateValue(value: unknown): string {
  return stringValue(value, new Date(0).toISOString());
}

async function existingByLegacyId(
  ctx: MutationCtx,
  table: "products" | "sales" | "saleLines" | "purchases" | "purchaseLines" | "stockMovements" | "otherTransactions",
  legacyId: number,
) {
  return await ctx.db.query(table).withIndex("by_legacy_id", (q) => q.eq("legacyId", legacyId)).unique();
}

export const importProjects = internalMutation({
  args: importArgs,
  handler: async (ctx, args) => {
    assertBridgeSecret(args.bridgeSecret);
    for (const raw of args.rows) {
      const row = raw as Record<string, unknown>;
      const legacyId = numberValue(row.id);
      const existing = await projectByLegacyId(ctx, legacyId);
      const values = {
        legacyId,
        name: stringValue(row.nombre),
        active: Boolean(row.activo),
      };
      if (existing) await ctx.db.patch(existing._id, values);
      else await ctx.db.insert("projects", values);
    }
    return args.rows.length;
  },
});

export const importMembers = internalMutation({
  args: importArgs,
  handler: async (ctx, args) => {
    assertBridgeSecret(args.bridgeSecret);
    for (const raw of args.rows) {
      const row = raw as Record<string, unknown>;
      const projectLegacyId = numberValue(row.proyecto_id);
      const project = await projectByLegacyId(ctx, projectLegacyId);
      if (!project) fail("validation_error", `Project ${projectLegacyId} is missing.`);
      const userId = stringValue(row.user_id);
      const existing = await ctx.db
        .query("projectMembers")
        .withIndex("by_user_project", (q) => q.eq("userId", userId).eq("projectId", project._id))
        .unique();
      const values = {
        projectId: project._id,
        userId,
        role: stringValue(row.rol, "miembro") === "admin" ? "admin" as const : "miembro" as const,
        createdAt: dateValue(row.creado_en),
      };
      if (existing) await ctx.db.patch(existing._id, values);
      else await ctx.db.insert("projectMembers", values);
    }
    return args.rows.length;
  },
});

/**
 * Rebinds memberships imported with a legacy Auth subject to the stable Convex
 * Auth user document id. Run this once per user after their first GitHub login.
 */
async function rebindMemberships(
  ctx: MutationCtx,
  legacyUserId: string,
  authUserId: string,
): Promise<number> {
  if (legacyUserId === authUserId) return 0;

  const memberships = await ctx.db
    .query("projectMembers")
    .withIndex("by_user", (q) => q.eq("userId", legacyUserId))
    .collect();
  let rebound = 0;

  for (const membership of memberships) {
    const existing = await ctx.db
      .query("projectMembers")
      .withIndex("by_user_project", (q) =>
        q.eq("userId", authUserId).eq("projectId", membership.projectId),
      )
      .unique();
    if (existing && existing._id !== membership._id) {
      if (membership.role === "admin" && existing.role !== "admin") {
        await ctx.db.patch(existing._id, { role: "admin" });
      }
      await ctx.db.delete(membership._id);
    } else {
      await ctx.db.patch(membership._id, { userId: authUserId });
    }
    rebound += 1;
  }

  return rebound;
}

export const rebindMemberUser = internalMutation({
  args: {
    bridgeSecret: v.string(),
    legacyUserId: v.string(),
    authUserId: v.string(),
  },
  handler: async (ctx, args) => {
    assertBridgeSecret(args.bridgeSecret);
    return await rebindMemberships(ctx, args.legacyUserId, args.authUserId);
  },
});

/**
 * Rebinds a legacy user's memberships by matching the new Convex Auth email.
 * This keeps the one-time operator workflow from requiring a browser JWT.
 */
export const rebindMemberByEmail = internalMutation({
  args: {
    bridgeSecret: v.string(),
    legacyUserId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    assertBridgeSecret(args.bridgeSecret);
    const email = args.email.trim().toLowerCase();
    const user = (await ctx.db.query("users").collect()).find(
      (candidate) => candidate.email?.trim().toLowerCase() === email,
    );
    if (!user) {
      fail("not_found", `No Convex Auth account exists for ${args.email}.`);
    }
    return await rebindMemberships(ctx, args.legacyUserId, user._id);
  },
});

export const importProducts = internalMutation({
  args: importArgs,
  handler: async (ctx, args) => {
    assertBridgeSecret(args.bridgeSecret);
    for (const raw of args.rows) {
      const row = raw as Record<string, unknown>;
      const legacyId = numberValue(row.id);
      const projectLegacyId = numberValue(row.proyecto_id);
      const project = await projectByLegacyId(ctx, projectLegacyId);
      if (!project) fail("validation_error", `Project ${projectLegacyId} is missing.`);
      const existing = await existingByLegacyId(ctx, "products", legacyId);
      const wallapopTitle = stringValue(row.titulo_wallapop).trim();
      const values = {
        legacyId,
        projectId: project._id,
        projectLegacyId,
        name: stringValue(row.nombre),
        ...(wallapopTitle ? { wallapopTitle } : {}),
      };
      if (existing) await ctx.db.patch(existing._id, values);
      else await ctx.db.insert("products", values);
    }
    return args.rows.length;
  },
});

export const importSales = internalMutation({
  args: importArgs,
  handler: async (ctx, args) => {
    assertBridgeSecret(args.bridgeSecret);
    for (const raw of args.rows) {
      const row = raw as Record<string, unknown>;
      const legacyId = numberValue(row.id);
      const projectLegacyId = numberValue(row.proyecto_id);
      const project = await projectByLegacyId(ctx, projectLegacyId);
      if (!project) fail("validation_error", `Project ${projectLegacyId} is missing.`);
      const existing = await existingByLegacyId(ctx, "sales", legacyId);
      const values = {
        legacyId,
        projectId: project._id,
        projectLegacyId,
        date: dateValue(row.fecha),
        channel: stringValue(row.canal),
      };
      if (existing) await ctx.db.patch(existing._id, values);
      else await ctx.db.insert("sales", values);
    }
    return args.rows.length;
  },
});

export const importSaleLines = internalMutation({
  args: importArgs,
  handler: async (ctx, args) => {
    assertBridgeSecret(args.bridgeSecret);
    for (const raw of args.rows) {
      const row = raw as Record<string, unknown>;
      const sale = await ctx.db
        .query("sales")
        .withIndex("by_legacy_id", (q) => q.eq("legacyId", numberValue(row.venta_id)))
        .unique();
      if (!sale) fail("validation_error", `Sale ${row.venta_id} is missing.`);
      const product = await productByLegacyId(ctx, sale.projectLegacyId, numberValue(row.producto_id));
      if (!product) fail("validation_error", `Product ${row.producto_id} is missing.`);
      const legacyId = numberValue(row.id);
      const values = {
        legacyId,
        saleId: sale._id,
        projectId: sale.projectId,
        projectLegacyId: sale.projectLegacyId,
        productId: product._id,
        productLegacyId: product.legacyId,
        units: numberValue(row.unidades),
        unitPriceCents: centsValue(row.precio_unitario_venta),
        vatRate: numberValue(row.porcentaje_iva),
      };
      const existing = await existingByLegacyId(ctx, "saleLines", legacyId);
      if (existing) await ctx.db.patch(existing._id, values);
      else await ctx.db.insert("saleLines", values);
    }
    return args.rows.length;
  },
});

export const importPurchases = internalMutation({
  args: importArgs,
  handler: async (ctx, args) => {
    assertBridgeSecret(args.bridgeSecret);
    for (const raw of args.rows) {
      const row = raw as Record<string, unknown>;
      const legacyId = numberValue(row.id);
      const projectLegacyId = numberValue(row.proyecto_id);
      const project = await projectByLegacyId(ctx, projectLegacyId);
      if (!project) fail("validation_error", `Project ${projectLegacyId} is missing.`);
      const existing = await existingByLegacyId(ctx, "purchases", legacyId);
      const values = {
        legacyId,
        projectId: project._id,
        projectLegacyId,
        date: dateValue(row.fecha),
      };
      if (existing) await ctx.db.patch(existing._id, values);
      else await ctx.db.insert("purchases", values);
    }
    return args.rows.length;
  },
});

export const importPurchaseLines = internalMutation({
  args: importArgs,
  handler: async (ctx, args) => {
    assertBridgeSecret(args.bridgeSecret);
    for (const raw of args.rows) {
      const row = raw as Record<string, unknown>;
      const purchase = await ctx.db
        .query("purchases")
        .withIndex("by_legacy_id", (q) => q.eq("legacyId", numberValue(row.compra_id)))
        .unique();
      if (!purchase) fail("validation_error", `Purchase ${row.compra_id} is missing.`);
      const product = await productByLegacyId(ctx, purchase.projectLegacyId, numberValue(row.producto_id));
      if (!product) fail("validation_error", `Product ${row.producto_id} is missing.`);
      const legacyId = numberValue(row.id);
      const values = {
        legacyId,
        purchaseId: purchase._id,
        projectId: purchase.projectId,
        projectLegacyId: purchase.projectLegacyId,
        productId: product._id,
        productLegacyId: product.legacyId,
        units: numberValue(row.unidades),
        unitPriceCents: centsValue(row.precio_unitario_compra),
        vatRate: numberValue(row.porcentaje_iva),
      };
      const existing = await existingByLegacyId(ctx, "purchaseLines", legacyId);
      if (existing) await ctx.db.patch(existing._id, values);
      else await ctx.db.insert("purchaseLines", values);
    }
    return args.rows.length;
  },
});

export const importMovements = internalMutation({
  args: importArgs,
  handler: async (ctx, args) => {
    assertBridgeSecret(args.bridgeSecret);
    for (const raw of args.rows) {
      const row = raw as Record<string, unknown>;
      const purchaseLine = row.ref_compra_detalle_id == null
        ? null
        : await ctx.db
          .query("purchaseLines")
          .withIndex("by_legacy_id", (q) => q.eq("legacyId", numberValue(row.ref_compra_detalle_id)))
          .unique();
      const saleLine = row.ref_venta_detalle_id == null
        ? null
        : await ctx.db
          .query("saleLines")
          .withIndex("by_legacy_id", (q) => q.eq("legacyId", numberValue(row.ref_venta_detalle_id)))
          .unique();
      const productId = numberValue(row.producto_id);
      const projectLegacyId = numberValue(row.proyecto_id);
      const product = await productByLegacyId(ctx, projectLegacyId, productId);
      if (!product) fail("validation_error", `Product ${productId} is missing.`);
      const movementType = ["compra", "venta", "devolucion_vta", "ajuste manual", "devolucion_com"].includes(stringValue(row.tipo_movimiento))
        ? stringValue(row.tipo_movimiento) as "compra" | "venta" | "devolucion_vta" | "ajuste manual" | "devolucion_com"
        : "ajuste manual" as const;
      const legacyId = numberValue(row.id);
      const values = {
        legacyId,
        productId: product._id,
        productLegacyId: product.legacyId,
        projectId: product.projectId,
        projectLegacyId: product.projectLegacyId,
        units: numberValue(row.unidades),
        type: movementType,
        ...(purchaseLine ? { purchaseLineId: purchaseLine._id } : {}),
        ...(saleLine ? { saleLineId: saleLine._id } : {}),
        date: dateValue(row.fecha),
      };
      const existing = await existingByLegacyId(ctx, "stockMovements", legacyId);
      if (existing) await ctx.db.patch(existing._id, values);
      else await ctx.db.insert("stockMovements", values);
    }
    return args.rows.length;
  },
});

export const importTransactions = internalMutation({
  args: importArgs,
  handler: async (ctx, args) => {
    assertBridgeSecret(args.bridgeSecret);
    for (const raw of args.rows) {
      const row = raw as Record<string, unknown>;
      const projectLegacyId = numberValue(row.proyecto_id);
      const project = await projectByLegacyId(ctx, projectLegacyId);
      if (!project) fail("validation_error", `Project ${projectLegacyId} is missing.`);
      const legacyId = numberValue(row.id);
      const values = {
        legacyId,
        projectId: project._id,
        projectLegacyId,
        type: stringValue(row.tipo) === "gasto" ? "gasto" as const : "ingreso" as const,
        concept: stringValue(row.concepto),
        ...(row.descripcion != null ? { description: stringValue(row.descripcion) } : {}),
        amountCents: centsValue(row.importe),
        vatRate: numberValue(row.porcentaje_iva),
        date: dateValue(row.fecha),
      };
      const existing = await existingByLegacyId(ctx, "otherTransactions", legacyId);
      if (existing) await ctx.db.patch(existing._id, values);
      else await ctx.db.insert("otherTransactions", values);
    }
    return args.rows.length;
  },
});

export const importApiKeys = internalMutation({
  args: importArgs,
  handler: async (ctx, args) => {
    assertBridgeSecret(args.bridgeSecret);
    let imported = 0;
    const skipped: string[] = [];

    for (const raw of args.rows) {
      const row = raw as Record<string, unknown>;
      // A key with no project was a wildcard over every project in the
      // deployment. That is exactly what the pinned-key rule removes, so such a
      // row is reported rather than silently carried over.
      if (row.proyecto_id == null) {
        skipped.push(stringValue(row.nombre, "(unnamed)"));
        continue;
      }

      const keyHash = stringValue(row.key_hash);
      const existing = await ctx.db
        .query("apiKeys")
        .withIndex("by_hash", (q) => q.eq("keyHash", keyHash))
        .unique();
      const rawScopes = Array.isArray(row.scopes) ? row.scopes : [];
      const scopes = rawScopes.filter((scope): scope is "read" | "write" => scope === "read" || scope === "write");
      const values = {
        name: stringValue(row.nombre),
        keyHash,
        keyPrefix: stringValue(row.key_prefix),
        projectLegacyId: numberValue(row.proyecto_id),
        scopes: scopes.length ? scopes : ["read" as const],
        active: Boolean(row.activa),
        ...(row.expira_en ? { expiresAt: stringValue(row.expira_en) } : {}),
        ...(row.ultimo_uso_en ? { lastUsedAt: stringValue(row.ultimo_uso_en) } : {}),
        createdAt: dateValue(row.creada_en),
      };
      if (existing) await ctx.db.patch(existing._id, values);
      else await ctx.db.insert("apiKeys", values);
      imported += 1;
    }

    return { imported, skippedUnpinned: skipped };
  },
});

/**
 * Upgrade an already-installed plugin after its private manifest moves from
 * the retired dashboard runtime contract to validated data hooks. This keeps
 * the project installation active without impersonating its administrator.
 */
export const upgradePluginInstallation = internalMutation({
  args: {
    projectLegacyId: v.number(),
    pluginId: v.string(),
    version: v.string(),
    sourceSha: v.string(),
    hooks: v.array(pluginHook),
  },
  handler: async (ctx, args) => {
    const project = await projectByLegacyId(ctx, args.projectLegacyId);
    if (!project) fail("not_found", `Project ${args.projectLegacyId} is missing.`);
    const installation = await ctx.db
      .query("pluginInstallations")
      .withIndex("by_project_plugin", (q) =>
        q.eq("projectId", project._id).eq("pluginId", args.pluginId),
      )
      .unique();
    if (!installation) fail("not_found", `Plugin ${args.pluginId} is not installed.`);
    await ctx.db.patch(installation._id, {
      version: args.version,
      sourceSha: args.sourceSha,
      hooks: args.hooks,
      runtimeProtocol: undefined,
      runtimeEndpoint: undefined,
      slots: undefined,
      permissions: undefined,
    });
    return { upgraded: true, enabled: installation.enabled };
  },
});

/**
 * Protected post-import audit. It is intentionally separate from the domain
 * API: business callers should not receive raw table counts, while the
 * migration operator needs to verify every imported relation.
 */
export const stats = internalQuery({
  args: { bridgeSecret: v.string() },
  handler: async (ctx, args) => {
    assertBridgeSecret(args.bridgeSecret);
    const [projects, members, products, sales, saleLines, purchases, purchaseLines, transactions, movements, apiKeys] =
      await Promise.all([
        ctx.db.query("projects").collect(),
        ctx.db.query("projectMembers").collect(),
        ctx.db.query("products").collect(),
        ctx.db.query("sales").collect(),
        ctx.db.query("saleLines").collect(),
        ctx.db.query("purchases").collect(),
        ctx.db.query("purchaseLines").collect(),
        ctx.db.query("otherTransactions").collect(),
        ctx.db.query("stockMovements").collect(),
        ctx.db.query("apiKeys").collect(),
      ]);

    return {
      projects: projects.length,
      members: members.length,
      products: products.length,
      sales: sales.length,
      saleLines: saleLines.length,
      purchases: purchases.length,
      purchaseLines: purchaseLines.length,
      otherTransactions: transactions.length,
      stockMovements: movements.length,
      apiKeys: apiKeys.length,
    };
  },
});
