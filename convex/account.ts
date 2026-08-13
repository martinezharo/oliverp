import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id, TableNames } from "./_generated/dataModel";
import {
  assertBridgeSecret,
  bridgeArgs,
  consumeWriteBudget,
  projectByLegacyId,
  requireAdmin,
  sessionUserId,
  type Actor,
} from "./lib/bridge";
import { activeKeyCount } from "./apiKeys";

/**
 * Project and account lifecycle.
 *
 * Erasing a project means erasing every row that hangs off it, which can be far
 * more documents than one Convex transaction may write. Each call therefore
 * deletes up to `BUDGET` documents and reports whether more remain, and the
 * caller repeats until it is done. That keeps deletion resumable: a call that
 * fails half-way leaves a smaller project behind rather than a corrupted one,
 * and the next call picks up where it stopped.
 */
const BUDGET = 1_000;

async function guard(
  ctx: MutationCtx,
  args: { bridgeSecret: string; actor: Actor },
): Promise<void> {
  assertBridgeSecret(args.bridgeSecret);
  await consumeWriteBudget(ctx, args.actor);
}

/**
 * Deletes at most `budget` child documents of a project.
 *
 * Order matters only for readability — nothing here reads another table while
 * deleting — but lines are removed before their parents so a partial purge
 * never leaves a sale pointing at lines that are gone.
 */
async function purgeProjectChildren(
  ctx: MutationCtx,
  project: Doc<"projects">,
  budget: number,
): Promise<number> {
  let remaining = budget;

  const drop = async (docs: Array<{ _id: Id<TableNames> }>) => {
    for (const doc of docs) {
      await ctx.db.delete(doc._id);
      remaining -= 1;
    }
  };

  // Each step is skipped once the budget is spent, so the next call resumes at
  // the first table that still has rows.
  if (remaining > 0) {
    await drop(
      await ctx.db
        .query("saleLines")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .take(remaining),
    );
  }
  if (remaining > 0) {
    await drop(
      await ctx.db
        .query("purchaseLines")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .take(remaining),
    );
  }
  if (remaining > 0) {
    await drop(
      await ctx.db
        .query("stockMovements")
        .withIndex("by_project_date", (q) => q.eq("projectId", project._id))
        .take(remaining),
    );
  }
  if (remaining > 0) {
    await drop(
      await ctx.db
        .query("sales")
        .withIndex("by_project_date", (q) => q.eq("projectId", project._id))
        .take(remaining),
    );
  }
  if (remaining > 0) {
    await drop(
      await ctx.db
        .query("purchases")
        .withIndex("by_project_date", (q) => q.eq("projectId", project._id))
        .take(remaining),
    );
  }
  if (remaining > 0) {
    await drop(
      await ctx.db
        .query("otherTransactions")
        .withIndex("by_project_date", (q) => q.eq("projectId", project._id))
        .take(remaining),
    );
  }
  if (remaining > 0) {
    await drop(
      await ctx.db
        .query("customers")
        .withIndex("by_project_name", (q) => q.eq("projectId", project._id))
        .take(remaining),
    );
  }
  if (remaining > 0) {
    await drop(
      await ctx.db
        .query("customerCounts")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .take(remaining),
    );
  }
  if (remaining > 0) {
    await drop(
      await ctx.db
        .query("products")
        .withIndex("by_project_name", (q) => q.eq("projectId", project._id))
        .take(remaining),
    );
  }
  if (remaining > 0) {
    await drop(
      await ctx.db
        .query("apiKeys")
        .withIndex("by_project", (q) => q.eq("projectLegacyId", project.legacyId))
        .take(remaining),
    );
  }
  if (remaining > 0) {
    await drop(
      await ctx.db
        .query("pluginInstallations")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .take(remaining),
    );
  }
  if (remaining > 0) {
    await drop(
      await ctx.db
        .query("counters")
        .withIndex("by_scope_name", (q) => q.eq("scope", `project:${project.legacyId}`))
        .take(remaining),
    );
  }
  if (remaining > 0) {
    await drop(
      await ctx.db
        .query("projectMembers")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .take(remaining),
    );
  }

  return budget - remaining;
}

/** Removes the project row once nothing references it any more. */
async function purgeProject(
  ctx: MutationCtx,
  project: Doc<"projects">,
  budget: number,
): Promise<{ done: boolean; deleted: number }> {
  const deleted = await purgeProjectChildren(ctx, project, budget);
  if (deleted >= budget) return { done: false, deleted };
  await ctx.db.delete(project._id);
  return { done: true, deleted: deleted + 1 };
}

export const deleteProject = mutation({
  args: { ...bridgeArgs, projectLegacyId: v.number() },
  handler: async (ctx, args) => {
    await guard(ctx, args);
    // `requireAdmin` refuses API keys outright, so a leaked integration token
    // can never erase a project.
    const project = await requireAdmin(ctx, args.actor, args.projectLegacyId);
    return await purgeProject(ctx, project, BUDGET);
  },
});

async function userProjects(
  ctx: QueryCtx | MutationCtx,
  userId: string,
): Promise<Doc<"projects">[]> {
  const memberships = await ctx.db
    .query("projectMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  return (
    await Promise.all(memberships.map((membership) => ctx.db.get(membership.projectId)))
  ).filter((project): project is Doc<"projects"> => project !== null);
}

/** Everything the account screen needs to describe what deletion would erase. */
export const summary = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject.split("|")[0];
    const projects = await userProjects(ctx, userId);

    const rows = await Promise.all(
      projects.map(async (project) => {
        const memberships = await ctx.db
          .query("projectMembers")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();
        const mine = memberships.find((membership) => membership.userId === userId);
        return {
          id: project.legacyId,
          nombre: project.name,
          rol: mine?.role ?? "miembro",
          miembros: memberships.length,
          api_keys: await activeKeyCount(ctx, project.legacyId),
        };
      }),
    );

    return { proyectos: rows.sort((a, b) => a.id - b.id) };
  },
});

/**
 * Erases the signed-in user: every project they belong to, then the Convex Auth
 * rows that let them sign back in.
 *
 * Projects are purged one call at a time like `deleteProject`, so the client
 * repeats until `done`. The account row is removed last, which means an
 * interrupted deletion leaves the user able to sign in and finish rather than
 * stranded with orphaned data.
 */
export const deleteAccount = mutation({
  args: bridgeArgs,
  handler: async (ctx, args) => {
    await guard(ctx, args);
    const userId = await sessionUserId(ctx, args.actor);

    let budget = BUDGET;
    for (const project of await userProjects(ctx, userId)) {
      const result = await purgeProject(ctx, project, budget);
      budget -= result.deleted;
      if (!result.done || budget <= 0) return { done: false };
    }

    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId as Id<"users">))
      .collect();
    for (const account of accounts) {
      const codes = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", account._id))
        .collect();
      for (const code of codes) await ctx.db.delete(code._id);
      await ctx.db.delete(account._id);
    }

    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId as Id<"users">))
      .collect();
    for (const session of sessions) {
      const tokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const token of tokens) await ctx.db.delete(token._id);
      await ctx.db.delete(session._id);
    }

    await ctx.db.delete(userId as Id<"users">);
    return { done: true };
  },
});

/**
 * Session-authenticated read of a single project, used by the settings screen
 * to confirm the project still exists between deletion steps.
 */
export const projectExists = query({
  args: { projectLegacyId: v.number() },
  handler: async (ctx, args) => {
    if ((await ctx.auth.getUserIdentity()) === null) return false;
    const project = await projectByLegacyId(ctx, args.projectLegacyId);
    if (!project) return false;
    const userId = (await ctx.auth.getUserIdentity())!.subject.split("|")[0];
    const membership = await ctx.db
      .query("projectMembers")
      .withIndex("by_user_project", (q) =>
        q.eq("userId", userId).eq("projectId", project._id),
      )
      .unique();
    return membership !== null;
  },
});
