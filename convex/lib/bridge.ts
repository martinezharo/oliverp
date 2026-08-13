import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { env } from "../_generated/server";
import { ConvexError } from "convex/values";
import { v } from "convex/values";

export const actorValidator = v.object({
  kind: v.union(v.literal("session"), v.literal("api_key")),
  userId: v.optional(v.string()),
  projectLegacyId: v.optional(v.number()),
  apiKeyId: v.optional(v.string()),
});

export type Actor = {
  kind: "session" | "api_key";
  userId?: string;
  projectLegacyId?: number;
  apiKeyId?: string;
};

export const bridgeArgs = {
  bridgeSecret: v.string(),
  actor: actorValidator,
};

export function assertBridgeSecret(secret: string): void {
  const expected = env.CONVEX_BRIDGE_SECRET;
  if (!expected || secret !== expected) {
    throw new ConvexError({ code: "unauthorized", message: "Backend bridge unauthorized." });
  }
}

export function fail(code: string, message: string): never {
  throw new ConvexError({ code, message });
}

/**
 * Resolve a browser session from Convex's verified JWT. The actor field is
 * retained for the Next gateway contract, but it is never trusted on its
 * own.
 */
export async function sessionUserId(
  ctx: QueryCtx | MutationCtx,
  actor: Actor,
): Promise<string> {
  if (actor.kind !== "session") fail("unauthorized", "A user session is required.");
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) fail("unauthorized", "A user session is required.");
  // Convex Auth's subject is `<userId>|<sessionId>`. The user document id is
  // stable across sessions and is the value stored in projectMembers.
  const userId = identity.subject.split("|")[0];
  if (actor.userId && actor.userId !== userId) {
    fail("unauthorized", "The session identity does not match the request.");
  }
  return userId;
}

export function cents(value: number): number {
  if (!Number.isFinite(value) || value < 0) fail("validation_error", "Money value is invalid.");
  return Math.round(value * 100);
}

export function euros(value: number): number {
  return Math.round((value / 100) * 100) / 100;
}

export function vatPart(grossCents: number, rate: number): number {
  if (!rate) return 0;
  return Math.round(grossCents * (rate / (100 + rate)));
}

type LegacyTable =
  | "products"
  | "customers"
  | "sales"
  | "saleLines"
  | "purchases"
  | "purchaseLines"
  | "stockMovements"
  | "otherTransactions";

/**
 * Allocates the next legacy id from a counter row.
 *
 * The previous implementation read the last row of `by_legacy_id`, which put
 * every insert in a table into the same read set: two users booking a sale at
 * the same time conflicted even though they share no data. Counters are keyed
 * per project, so that contention is now confined to a single project.
 *
 * A consequence is that legacy ids are unique *within a project*, not
 * globally. Every lookup by legacy id is therefore project-scoped.
 */
/**
 * The starting point for a counter that does not exist yet.
 *
 * Deployments that predate the counters already contain rows whose ids came
 * from the old global sequence. Starting a fresh counter at zero would hand out
 * ids that are already taken, so the first use adopts the highest id currently
 * in that project. This makes the change to per-project sequences self-applying
 * rather than something an operator has to remember to run.
 */
async function highestExistingId(
  ctx: MutationCtx,
  table: LegacyTable,
  projectLegacyId: number,
): Promise<number> {
  const last = await ctx.db
    .query(table)
    .withIndex("by_project_legacy", (q) => q.eq("projectLegacyId", projectLegacyId))
    .order("desc")
    .first();
  return last?.legacyId ?? 0;
}

async function bumpCounter(
  ctx: MutationCtx,
  scope: string,
  name: string,
  count: number,
  seed: () => Promise<number>,
): Promise<number> {
  const existing = await ctx.db
    .query("counters")
    .withIndex("by_scope_name", (q) => q.eq("scope", scope).eq("name", name))
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, { value: existing.value + count });
    return existing.value + 1;
  }

  const base = await seed();
  await ctx.db.insert("counters", { scope, name, value: base + count });
  return base + 1;
}

export async function nextLegacyId(
  ctx: MutationCtx,
  table: LegacyTable,
  projectLegacyId: number,
): Promise<number> {
  return await bumpCounter(ctx, `project:${projectLegacyId}`, table, 1, () =>
    highestExistingId(ctx, table, projectLegacyId),
  );
}

/**
 * Reserves `count` consecutive ids in one step. The line writers hand out ids
 * from a local cursor, so the counter has to advance by the whole batch or the
 * next caller would be given ids that are already in use.
 */
export async function reserveLegacyIds(
  ctx: MutationCtx,
  table: LegacyTable,
  projectLegacyId: number,
  count: number,
): Promise<number> {
  return await bumpCounter(ctx, `project:${projectLegacyId}`, table, Math.max(count, 0), () =>
    highestExistingId(ctx, table, projectLegacyId),
  );
}

/** Projects are the one table whose ids stay globally unique. */
export async function nextProjectLegacyId(ctx: MutationCtx): Promise<number> {
  return await bumpCounter(ctx, "global", "projects", 1, async () => {
    const last = await ctx.db
      .query("projects")
      .withIndex("by_legacy_id")
      .order("desc")
      .first();
    return last?.legacyId ?? 0;
  });
}

const WRITE_LIMIT = 240;
const WRITE_WINDOW_MS = 60_000;

/**
 * A fixed-window write budget per actor.
 *
 * Public sign-up means an unknown number of accounts share one Convex
 * deployment and the unbounded `.collect()` reads documented in docs/AUDIT.md.
 * The budget is far above what the UI produces and only bites on automated
 * abuse.
 */
export async function consumeWriteBudget(ctx: MutationCtx, actor: Actor): Promise<void> {
  const identity = actor.kind === "api_key" ? `key:${actor.apiKeyId ?? "unknown"}` : null;
  const key = identity ?? `user:${await sessionUserId(ctx, actor)}`;
  const now = Date.now();

  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();

  if (!existing || now - existing.windowStart >= WRITE_WINDOW_MS) {
    if (existing) await ctx.db.patch(existing._id, { windowStart: now, count: 1 });
    else await ctx.db.insert("rateLimits", { key, windowStart: now, count: 1 });
    return;
  }

  if (existing.count >= WRITE_LIMIT) {
    fail("rate_limited", "Too many writes. Wait a moment before retrying.");
  }
  await ctx.db.patch(existing._id, { count: existing.count + 1 });
}

export async function projectByLegacyId(
  ctx: QueryCtx | MutationCtx,
  projectLegacyId: number,
) {
  return await ctx.db
    .query("projects")
    .withIndex("by_legacy_id", (q) => q.eq("legacyId", projectLegacyId))
    .unique();
}

export async function requireProject(
  ctx: QueryCtx | MutationCtx,
  actor: Actor,
  projectLegacyId: number,
) {
  const project = await projectByLegacyId(ctx, projectLegacyId);
  if (!project) fail("not_found", `Project ${projectLegacyId} not found.`);

  if (actor.kind === "api_key") {
    // An API key with no project used to fall through to unrestricted access.
    // There is no owner to fall back to, so a key without a pin is refused
    // outright rather than treated as a wildcard.
    if (actor.projectLegacyId === undefined) {
      fail("forbidden", "This API key is not bound to a project.");
    }
    if (actor.projectLegacyId !== projectLegacyId) {
      fail("forbidden", "This API key cannot access that project.");
    }
    return project;
  }

  const userId = await sessionUserId(ctx, actor);
  const membership = await ctx.db
    .query("projectMembers")
    .withIndex("by_user_project", (q) =>
      q.eq("userId", userId).eq("projectId", project._id),
    )
    .unique();
  if (!membership) fail("forbidden", "You are not a member of that project.");
  return project;
}

/**
 * Whether a user administers a project.
 *
 * Split out of `requireAdmin` so a read that merely wants to *report* the
 * answer — the settings screen listing API keys — decides it with the same
 * lookup the enforcing path uses, instead of catching a thrown error.
 */
export async function isProjectAdmin(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  projectId: Id<"projects">,
): Promise<boolean> {
  const membership = await ctx.db
    .query("projectMembers")
    .withIndex("by_user_project", (q) =>
      q.eq("userId", userId).eq("projectId", projectId),
    )
    .unique();
  return membership?.role === "admin";
}

/**
 * Administrative operations are destructive and irreversible, so they are
 * restricted to a signed-in admin member. An API key is a delegated,
 * project-scoped credential and can never reach them, however it was minted.
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
  actor: Actor,
  projectLegacyId: number,
) {
  const project = await requireProject(ctx, actor, projectLegacyId);
  if (actor.kind === "api_key") {
    fail("forbidden", "An API key cannot perform administrative operations.");
  }
  const userId = await sessionUserId(ctx, actor);
  if (!(await isProjectAdmin(ctx, userId, project._id))) {
    fail("forbidden", "Only project admins can perform this operation.");
  }
  return project;
}

export async function productByLegacyId(
  ctx: QueryCtx | MutationCtx,
  projectLegacyId: number,
  productLegacyId: number,
) {
  return await ctx.db
    .query("products")
    .withIndex("by_project_legacy", (q) =>
      q.eq("projectLegacyId", projectLegacyId).eq("legacyId", productLegacyId),
    )
    .unique();
}

export async function requireProduct(
  ctx: QueryCtx | MutationCtx,
  actor: Actor,
  projectLegacyId: number,
  productLegacyId: number,
) {
  await requireProject(ctx, actor, projectLegacyId);
  const product = await productByLegacyId(ctx, projectLegacyId, productLegacyId);
  if (!product) fail("not_found", `Product ${productLegacyId} not found.`);
  return product;
}

/**
 * Legacy ids are unique per project, so each of these takes the project it was
 * issued in. Resolving through the project index also means a caller can never
 * probe for the existence of a row outside the projects it can reach: the
 * lookup simply finds nothing.
 */
export async function saleByLegacyId(
  ctx: QueryCtx | MutationCtx,
  projectLegacyId: number,
  legacyId: number,
) {
  return await ctx.db
    .query("sales")
    .withIndex("by_project_legacy", (q) =>
      q.eq("projectLegacyId", projectLegacyId).eq("legacyId", legacyId),
    )
    .unique();
}

export async function purchaseByLegacyId(
  ctx: QueryCtx | MutationCtx,
  projectLegacyId: number,
  legacyId: number,
) {
  return await ctx.db
    .query("purchases")
    .withIndex("by_project_legacy", (q) =>
      q.eq("projectLegacyId", projectLegacyId).eq("legacyId", legacyId),
    )
    .unique();
}

export async function transactionByLegacyId(
  ctx: QueryCtx | MutationCtx,
  projectLegacyId: number,
  legacyId: number,
) {
  return await ctx.db
    .query("otherTransactions")
    .withIndex("by_project_legacy", (q) =>
      q.eq("projectLegacyId", projectLegacyId).eq("legacyId", legacyId),
    )
    .unique();
}

export type ProjectId = Id<"projects">;
