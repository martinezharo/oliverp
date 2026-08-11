import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { consumeWriteBudget, requireAdmin, requireProject, sessionUserId, type Actor } from "./lib/bridge";

const sessionActor: Actor = { kind: "session" };
const effect = v.union(v.literal("dashboard.solo_iva"));

const manifestArgs = {
  pluginId: v.string(),
  name: v.string(),
  description: v.string(),
  version: v.string(),
  repositoryUrl: v.string(),
  sourceSha: v.string(),
  effects: v.array(effect),
};

function assertHttps(value: string, field: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${field} must be a valid URL.`);
  }
  if (url.protocol !== "https:") throw new Error(`${field} must use HTTPS.`);
}

function validateManifest(args: {
  pluginId: string;
  name: string;
  description: string;
  version: string;
  repositoryUrl: string;
  sourceSha: string;
  effects: string[];
}): void {
  if (!/^[a-z0-9](?:[a-z0-9.-]{1,78}[a-z0-9])?$/.test(args.pluginId)) {
    throw new Error("The plugin id is not valid.");
  }
  if (!args.name.trim() || args.name.length > 80) throw new Error("The plugin name is not valid.");
  if (args.description.length > 300) throw new Error("The plugin description is too long.");
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(args.version)) {
    throw new Error("The plugin version must use semantic versioning.");
  }
  if (!/^[a-f0-9]{40}$/.test(args.sourceSha)) throw new Error("The manifest source SHA is not valid.");
  assertHttps(args.repositoryUrl, "repositoryUrl");
  if (new Set(args.effects).size !== args.effects.length) {
    throw new Error("Plugin effects cannot be repeated.");
  }
}

function publicInstallation(row: {
  pluginId: string;
  name: string;
  description: string;
  version: string;
  repositoryUrl: string;
  sourceSha: string;
  effects: Array<"dashboard.solo_iva">;
  enabled: boolean;
  installedAt: string;
}) {
  return row;
}

export const list = query({
  args: { projectLegacyId: v.number() },
  handler: async (ctx, args) => {
    if ((await ctx.auth.getUserIdentity()) === null) return [];
    const project = await requireProject(ctx, sessionActor, args.projectLegacyId);
    const rows = await ctx.db
      .query("pluginInstallations")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();
    return rows.sort((a, b) => a.name.localeCompare(b.name)).map(publicInstallation);
  },
});

export const install = mutation({
  args: { projectLegacyId: v.number(), ...manifestArgs },
  handler: async (ctx, args) => {
    validateManifest(args);
    await consumeWriteBudget(ctx, sessionActor);
    const project = await requireAdmin(ctx, sessionActor, args.projectLegacyId);
    const installedBy = await sessionUserId(ctx, sessionActor);
    const existing = await ctx.db
      .query("pluginInstallations")
      .withIndex("by_project_plugin", (q) =>
        q.eq("projectId", project._id).eq("pluginId", args.pluginId),
      )
      .unique();
    const values = {
      projectId: project._id,
      projectLegacyId: project.legacyId,
      pluginId: args.pluginId,
      name: args.name.trim(),
      description: args.description.trim(),
      version: args.version,
      repositoryUrl: args.repositoryUrl,
      sourceSha: args.sourceSha,
      effects: args.effects,
      enabled: true,
      installedBy,
      installedAt: new Date().toISOString(),
    };
    if (existing) {
      await ctx.db.replace(existing._id, values);
      return publicInstallation(values);
    }
    await ctx.db.insert("pluginInstallations", values);
    return publicInstallation(values);
  },
});

export const uninstall = mutation({
  args: { projectLegacyId: v.number(), pluginId: v.string() },
  handler: async (ctx, args) => {
    await consumeWriteBudget(ctx, sessionActor);
    const project = await requireAdmin(ctx, sessionActor, args.projectLegacyId);
    const existing = await ctx.db
      .query("pluginInstallations")
      .withIndex("by_project_plugin", (q) =>
        q.eq("projectId", project._id).eq("pluginId", args.pluginId),
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    return { removed: existing !== null };
  },
});

export const setEnabled = mutation({
  args: { projectLegacyId: v.number(), pluginId: v.string(), enabled: v.boolean() },
  handler: async (ctx, args) => {
    await consumeWriteBudget(ctx, sessionActor);
    const project = await requireAdmin(ctx, sessionActor, args.projectLegacyId);
    const existing = await ctx.db
      .query("pluginInstallations")
      .withIndex("by_project_plugin", (q) =>
        q.eq("projectId", project._id).eq("pluginId", args.pluginId),
      )
      .unique();
    if (!existing) throw new Error("The plugin is not installed for this project.");
    await ctx.db.patch(existing._id, { enabled: args.enabled });
    return { enabled: args.enabled };
  },
});
