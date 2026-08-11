import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const role = v.union(v.literal("admin"), v.literal("miembro"));
const saleStatus = v.union(
  v.literal("pendiente"),
  v.literal("enviada"),
  v.literal("devuelta"),
  v.literal("reembolsada"),
);
const purchaseStatus = v.union(
  v.literal("pendiente"),
  v.literal("recibida"),
  v.literal("cancelada"),
);
const transactionType = v.union(v.literal("ingreso"), v.literal("gasto"));
const movementType = v.union(
  v.literal("compra"),
  v.literal("venta"),
  v.literal("devolucion_vta"),
  v.literal("ajuste manual"),
  v.literal("devolucion_com"),
);
const pluginSlot = v.union(v.literal("dashboard.summary"));
const pluginPermission = v.union(v.literal("finances:read"));

/**
 * Convex's _id is intentionally not exposed as the public API id. The
 * legacyId fields preserve the existing integer contract while letting the
 * backend use typed Convex document references internally.
 */
export default defineSchema({
  ...authTables,

  projects: defineTable({
    legacyId: v.number(),
    name: v.string(),
    active: v.boolean(),
  })
    .index("by_legacy_id", ["legacyId"])
    .index("by_name", ["name"]),

  projectMembers: defineTable({
    projectId: v.id("projects"),
    userId: v.string(),
    role,
    createdAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_project", ["userId", "projectId"])
    .index("by_project", ["projectId"]),

  products: defineTable({
    legacyId: v.number(),
    projectId: v.id("projects"),
    projectLegacyId: v.number(),
    name: v.string(),
    wallapopTitle: v.optional(v.string()),
    vintedTitle: v.optional(v.string()),
  })
    .index("by_legacy_id", ["legacyId"])
    .index("by_project_name", ["projectId", "name"])
    .index("by_project_legacy", ["projectLegacyId", "legacyId"])
    .index("by_project_wallapop_title", ["projectId", "wallapopTitle"])
    .index("by_project_vinted_title", ["projectId", "vintedTitle"]),

  customers: defineTable({
    legacyId: v.number(),
    projectId: v.id("projects"),
    projectLegacyId: v.number(),
    name: v.string(),
    normalizedName: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_legacy_id", ["legacyId"])
    .index("by_project_name", ["projectId", "name"])
    .index("by_project_legacy", ["projectLegacyId", "legacyId"])
    .index("by_project_normalized_name", ["projectId", "normalizedName"]),

  customerCounts: defineTable({
    projectId: v.id("projects"),
    projectLegacyId: v.number(),
    count: v.number(),
  }).index("by_project", ["projectId"]),

  sales: defineTable({
    legacyId: v.number(),
    projectId: v.id("projects"),
    projectLegacyId: v.number(),
    date: v.string(),
    channel: v.string(),
    status: saleStatus,
    customerId: v.optional(v.id("customers")),
    origin: v.optional(v.string()),
    originId: v.optional(v.string()),
  })
    .index("by_legacy_id", ["legacyId"])
    .index("by_project_date", ["projectId", "date"])
    .index("by_project_legacy", ["projectLegacyId", "legacyId"])
    .index("by_project_origin", ["projectId", "origin"]),

  saleLines: defineTable({
    legacyId: v.number(),
    saleId: v.id("sales"),
    projectId: v.id("projects"),
    projectLegacyId: v.number(),
    productId: v.id("products"),
    productLegacyId: v.number(),
    units: v.number(),
    unitPriceCents: v.number(),
    vatRate: v.number(),
  })
    .index("by_legacy_id", ["legacyId"])
    .index("by_sale", ["saleId"])
    .index("by_product", ["productId"])
    .index("by_project", ["projectId"])
    .index("by_project_legacy", ["projectLegacyId", "legacyId"]),

  purchases: defineTable({
    legacyId: v.number(),
    projectId: v.id("projects"),
    projectLegacyId: v.number(),
    date: v.string(),
    status: purchaseStatus,
  })
    .index("by_legacy_id", ["legacyId"])
    .index("by_project_date", ["projectId", "date"])
    .index("by_project_legacy", ["projectLegacyId", "legacyId"]),

  purchaseLines: defineTable({
    legacyId: v.number(),
    purchaseId: v.id("purchases"),
    projectId: v.id("projects"),
    projectLegacyId: v.number(),
    productId: v.id("products"),
    productLegacyId: v.number(),
    units: v.number(),
    unitPriceCents: v.number(),
    vatRate: v.number(),
  })
    .index("by_legacy_id", ["legacyId"])
    .index("by_purchase", ["purchaseId"])
    .index("by_product", ["productId"])
    .index("by_project", ["projectId"])
    .index("by_project_legacy", ["projectLegacyId", "legacyId"]),

  stockMovements: defineTable({
    legacyId: v.number(),
    productId: v.id("products"),
    productLegacyId: v.number(),
    projectId: v.id("projects"),
    projectLegacyId: v.number(),
    units: v.number(),
    type: movementType,
    purchaseLineId: v.optional(v.id("purchaseLines")),
    saleLineId: v.optional(v.id("saleLines")),
    date: v.string(),
  })
    .index("by_legacy_id", ["legacyId"])
    .index("by_product", ["productId"])
    .index("by_project_date", ["projectId", "date"])
    .index("by_project_legacy", ["projectLegacyId", "legacyId"])
    .index("by_purchase_line", ["purchaseLineId"])
    .index("by_sale_line", ["saleLineId"]),

  otherTransactions: defineTable({
    legacyId: v.number(),
    projectId: v.id("projects"),
    projectLegacyId: v.number(),
    type: transactionType,
    concept: v.string(),
    description: v.optional(v.string()),
    amountCents: v.number(),
    vatRate: v.number(),
    date: v.string(),
  })
    .index("by_legacy_id", ["legacyId"])
    .index("by_project_date", ["projectId", "date"])
    .index("by_project_legacy", ["projectLegacyId", "legacyId"])
    .index("by_project_type_date", ["projectId", "type", "date"]),

  /**
   * Every key is pinned to exactly one project. An unpinned key used to mean
   * "all of my projects"; with public sign-up it would mean "every project of
   * every user", so the field is required and enforced in `requireProject`.
   */
  apiKeys: defineTable({
    name: v.string(),
    keyHash: v.string(),
    keyPrefix: v.string(),
    projectLegacyId: v.number(),
    scopes: v.array(v.union(v.literal("read"), v.literal("write"))),
    active: v.boolean(),
    expiresAt: v.optional(v.string()),
    lastUsedAt: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_hash", ["keyHash"])
    .index("by_project", ["projectLegacyId"]),

  /**
   * Plugins are private, project-scoped integrations. OlivERP grants explicit
   * data permissions to their remote runtimes and renders only validated,
   * host-native view documents; plugin code never runs in the browser.
   */
  pluginInstallations: defineTable({
    projectId: v.id("projects"),
    projectLegacyId: v.number(),
    pluginId: v.string(),
    name: v.string(),
    description: v.string(),
    version: v.string(),
    repositoryUrl: v.string(),
    sourceSha: v.string(),
    runtimeProtocol: v.literal(1),
    runtimeEndpoint: v.string(),
    slots: v.array(pluginSlot),
    permissions: v.array(pluginPermission),
    enabled: v.boolean(),
    installedBy: v.string(),
    installedAt: v.string(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_plugin", ["projectId", "pluginId"]),

  /**
   * Legacy id sequences. Reading the tail of a `by_legacy_id` index to find the
   * next id made every insert in a table conflict with every other insert in
   * that table, across unrelated projects. A counter row per (scope, name)
   * confines that contention to one project.
   */
  counters: defineTable({
    scope: v.string(),
    name: v.string(),
    value: v.number(),
  }).index("by_scope_name", ["scope", "name"]),

  /** Fixed-window write budgets, keyed by actor. */
  rateLimits: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_key", ["key"]),

  idempotencyKeys: defineTable({
    key: v.string(),
    endpoint: v.string(),
    apiKeyId: v.optional(v.string()),
    requestHash: v.string(),
    responseStatus: v.number(),
    responseBody: v.any(),
    createdAt: v.string(),
  })
    .index("by_key_endpoint", ["key", "endpoint"])
    .index("by_created_at", ["createdAt"]),
});
