import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  assertBridgeSecret,
  bridgeArgs,
  consumeWriteBudget,
  fail,
  isProjectAdmin,
  projectByLegacyId,
  requireAdmin,
  type Actor,
} from "./lib/bridge";

/**
 * API key lifecycle.
 *
 * Everything that touches the `apiKeys` table lives here: the request-time
 * lookups the gateway performs on every machine call, and the administrative
 * surface behind the settings screen. They used to sit among the accounting
 * functions in `domain.ts`, where the fact that minting a key is an admin-only
 * act was easy to miss.
 *
 * Two doors lead to a new key, and they authorize differently:
 *
 * - `create` is the browser path. It carries a user session and is refused to
 *   anyone who is not an admin of the project the key is pinned to.
 * - `createUnattended` is the operator path used by `scripts/create-api-key.mjs`,
 *   where there is no user to authenticate. Holding `CONVEX_BRIDGE_SECRET` is
 *   the authorization, which is why it is never reachable from the browser.
 *
 * Both mint through `insertApiKey`, so the two doors cannot drift apart in what
 * they store.
 */

const scopesValidator = v.array(v.union(v.literal("read"), v.literal("write")));

type Scope = "read" | "write";

/** The shape the settings screen renders. The hash never leaves the database. */
function publicKey(key: Doc<"apiKeys">) {
  return {
    id: key._id,
    nombre: key.name,
    prefijo: key.keyPrefix,
    scopes: key.scopes,
    activa: key.active,
    expira_en: key.expiresAt ?? null,
    ultimo_uso_en: key.lastUsedAt ?? null,
    creada_en: key.createdAt,
  };
}

async function insertApiKey(
  ctx: MutationCtx,
  values: {
    name: string;
    projectLegacyId: number;
    keyHash: string;
    keyPrefix: string;
    scopes: Scope[];
    expiresAt?: string;
  },
) {
  const id = await ctx.db.insert("apiKeys", {
    name: values.name,
    keyHash: values.keyHash,
    keyPrefix: values.keyPrefix,
    projectLegacyId: values.projectLegacyId,
    scopes: values.scopes,
    active: true,
    ...(values.expiresAt ? { expiresAt: values.expiresAt } : {}),
    createdAt: new Date().toISOString(),
  });
  return {
    id,
    nombre: values.name,
    proyecto_id: values.projectLegacyId,
    scopes: values.scopes,
    expira_en: values.expiresAt ?? null,
  };
}

async function guard(
  ctx: MutationCtx,
  args: { bridgeSecret: string; actor: Actor },
): Promise<void> {
  assertBridgeSecret(args.bridgeSecret);
  await consumeWriteBudget(ctx, args.actor);
}

/* -------------------------------------------------------------------------- */
/* Request-time lookups                                                       */
/* -------------------------------------------------------------------------- */

export const byHash = query({
  args: { bridgeSecret: v.string(), keyHash: v.string() },
  handler: async (ctx, args) => {
    assertBridgeSecret(args.bridgeSecret);
    const key = await ctx.db
      .query("apiKeys")
      .withIndex("by_hash", (q) => q.eq("keyHash", args.keyHash))
      .unique();
    if (!key) return null;
    return {
      id: key._id,
      proyecto_id: key.projectLegacyId ?? null,
      scopes: key.scopes,
      activa: key.active,
      expira_en: key.expiresAt ?? null,
      ultimo_uso_en: key.lastUsedAt ?? null,
    };
  },
});

export const touch = mutation({
  args: { bridgeSecret: v.string(), keyId: v.string(), lastUsedAt: v.string() },
  handler: async (ctx, args) => {
    assertBridgeSecret(args.bridgeSecret);
    const key = await ctx.db.get(args.keyId as Id<"apiKeys">);
    if (key) await ctx.db.patch(key._id, { lastUsedAt: args.lastUsedAt });
    return null;
  },
});

/* -------------------------------------------------------------------------- */
/* Administration                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The keys of one project, newest first.
 *
 * Read straight from the browser with the Convex session, like
 * `account.summary`, so revoking a key updates the list without a refetch.
 * A non-admin gets `null` rather than an error: the settings screen renders
 * that as "no access" instead of tearing down to an error boundary.
 */
export const list = query({
  args: { projectLegacyId: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const project = await projectByLegacyId(ctx, args.projectLegacyId);
    if (!project) return null;
    const userId = identity.subject.split("|")[0];
    if (!(await isProjectAdmin(ctx, userId, project._id))) return null;

    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_project", (q) => q.eq("projectLegacyId", args.projectLegacyId))
      .collect();
    return keys
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(publicKey);
  },
});

export const create = mutation({
  args: {
    ...bridgeArgs,
    name: v.string(),
    projectLegacyId: v.number(),
    keyHash: v.string(),
    keyPrefix: v.string(),
    scopes: scopesValidator,
    expiresAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await guard(ctx, args);
    // `requireAdmin` also proves the project exists, so a key can never end up
    // pinned to nothing and sit in the table looking valid until first use.
    await requireAdmin(ctx, args.actor, args.projectLegacyId);
    return await insertApiKey(ctx, args);
  },
});

/**
 * Revocation deletes the row instead of clearing `active`.
 *
 * A revoked key is worthless — the plaintext was never stored and the hash can
 * never be reissued — so keeping the row would only accumulate rows nobody can
 * see or use. `active` stays in the schema for keys disabled without being
 * withdrawn.
 */
export const revoke = mutation({
  args: { ...bridgeArgs, keyId: v.string() },
  handler: async (ctx, args) => {
    await guard(ctx, args);
    const key = await ctx.db.get(args.keyId as Id<"apiKeys">);
    if (!key) fail("not_found", "That API key no longer exists.");
    await requireAdmin(ctx, args.actor, key.projectLegacyId);
    await ctx.db.delete(key._id);
    return { id: key._id, nombre: key.name };
  },
});

/**
 * The CLI path: no user session, authorized by the bridge secret alone.
 * See the module comment for why it is separate from `create`.
 */
export const createUnattended = mutation({
  args: {
    bridgeSecret: v.string(),
    name: v.string(),
    projectLegacyId: v.number(),
    keyHash: v.string(),
    keyPrefix: v.string(),
    scopes: scopesValidator,
    expiresAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertBridgeSecret(args.bridgeSecret);
    const project = await projectByLegacyId(ctx, args.projectLegacyId);
    if (!project) fail("not_found", `Project ${args.projectLegacyId} not found.`);
    return await insertApiKey(ctx, args);
  },
});

/** Exported for the account summary, which counts keys it must not expose. */
export async function activeKeyCount(
  ctx: QueryCtx | MutationCtx,
  projectLegacyId: number,
): Promise<number> {
  const keys = await ctx.db
    .query("apiKeys")
    .withIndex("by_project", (q) => q.eq("projectLegacyId", projectLegacyId))
    .collect();
  return keys.filter((key) => key.active).length;
}
