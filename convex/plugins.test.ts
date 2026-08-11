/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
type Harness = ReturnType<typeof convexTest>;

async function seed(t: Harness) {
  return await t.run(async (ctx) => {
    const admin = await ctx.db.insert("users", { name: "Admin" });
    const member = await ctx.db.insert("users", { name: "Member" });
    const outsider = await ctx.db.insert("users", { name: "Outsider" });
    const projectId = await ctx.db.insert("projects", { legacyId: 7, name: "Plugin project", active: true });
    await ctx.db.insert("projectMembers", { projectId, userId: admin, role: "admin", createdAt: new Date(0).toISOString() });
    await ctx.db.insert("projectMembers", { projectId, userId: member, role: "miembro", createdAt: new Date(0).toISOString() });
    return { admin, member, outsider };
  });
}

const asUser = (t: Harness, userId: string) => t.withIdentity({ subject: `${userId}|session` });
const manifest = {
  projectLegacyId: 7,
  pluginId: "com.4oli.solo-iva",
  name: "Solo IVA",
  description: "VAT totals",
  version: "1.0.0",
  repositoryUrl: "https://github.com/martinezharo/oliverp-plugin-solo-iva",
  sourceSha: "0123456789abcdef0123456789abcdef01234567",
  hooks: [{ type: "finance.other_transaction.vat_only" as const, concept: "solo_iva" }],
};

describe("plugin installations", () => {
  it("lets an admin install a project-scoped manifest", async () => {
    const t = convexTest(schema, modules);
    const { admin } = await seed(t);
    const installed = await asUser(t, admin).mutation(api.plugins.install, manifest);
    expect(installed).toMatchObject({ pluginId: manifest.pluginId, hooks: manifest.hooks, enabled: true });
    await expect(asUser(t, admin).query(api.plugins.list, { projectLegacyId: 7 })).resolves.toHaveLength(1);
  });

  it("allows members to receive installed plugins but not manage them", async () => {
    const t = convexTest(schema, modules);
    const { admin, member } = await seed(t);
    await asUser(t, admin).mutation(api.plugins.install, manifest);
    await expect(asUser(t, member).query(api.plugins.list, { projectLegacyId: 7 })).resolves.toHaveLength(1);
    await expect(asUser(t, member).mutation(api.plugins.install, manifest)).rejects.toThrow(/only project admins/i);
  });

  it("does not reveal installations to another tenant", async () => {
    const t = convexTest(schema, modules);
    const { admin, outsider } = await seed(t);
    await asUser(t, admin).mutation(api.plugins.install, manifest);
    await expect(asUser(t, outsider).query(api.plugins.list, { projectLegacyId: 7 })).rejects.toThrow(/not a member/i);
  });

  it("rejects non-HTTPS repositories", async () => {
    const t = convexTest(schema, modules);
    const { admin } = await seed(t);
    await expect(asUser(t, admin).mutation(api.plugins.install, { ...manifest, repositoryUrl: "http://github.invalid/plugin" })).rejects.toThrow(/HTTPS/i);
  });

  it("lets an admin activate and deactivate an installed plugin", async () => {
    const t = convexTest(schema, modules);
    const { admin } = await seed(t);
    await asUser(t, admin).mutation(api.plugins.install, manifest);
    await expect(asUser(t, admin).mutation(api.plugins.setEnabled, { projectLegacyId: 7, pluginId: manifest.pluginId, enabled: false })).resolves.toEqual({ enabled: false });
    await expect(asUser(t, admin).query(api.plugins.list, { projectLegacyId: 7 })).resolves.toMatchObject([{ enabled: false }]);
  });

  it("revokes the installation without changing project records", async () => {
    const t = convexTest(schema, modules);
    const { admin } = await seed(t);
    await asUser(t, admin).mutation(api.plugins.install, manifest);
    await expect(asUser(t, admin).mutation(api.plugins.uninstall, { projectLegacyId: 7, pluginId: manifest.pluginId })).resolves.toEqual({ removed: true });
    await expect(asUser(t, admin).query(api.plugins.list, { projectLegacyId: 7 })).resolves.toEqual([]);
    await expect(t.run((ctx) => ctx.db.query("projects").collect())).resolves.toHaveLength(1);
  });

  it("upgrades the active legacy runtime installation to hooks without replacing it", async () => {
    const t = convexTest(schema, modules);
    const { admin } = await seed(t);
    await t.run(async (ctx) => {
      const project = await ctx.db
        .query("projects")
        .withIndex("by_legacy_id", (q) => q.eq("legacyId", 7))
        .unique();
      if (!project) throw new Error("Missing test project.");
      await ctx.db.insert("pluginInstallations", {
        projectId: project._id,
        projectLegacyId: 7,
        pluginId: manifest.pluginId,
        name: manifest.name,
        description: manifest.description,
        version: "3.0.0",
        repositoryUrl: manifest.repositoryUrl,
        sourceSha: manifest.sourceSha,
        runtimeProtocol: 1,
        runtimeEndpoint: "https://legacy.invalid/render",
        slots: ["dashboard.summary"],
        permissions: ["finances:read"],
        enabled: true,
        installedBy: admin,
        installedAt: new Date(0).toISOString(),
      });
    });

    await t.mutation(internal.migration.upgradePluginInstallation, {
      projectLegacyId: 7,
      pluginId: manifest.pluginId,
      version: "4.0.0",
      sourceSha: "89abcdef0123456789abcdef0123456789abcdef",
      hooks: manifest.hooks,
    });

    await expect(asUser(t, admin).query(api.plugins.list, { projectLegacyId: 7 })).resolves.toMatchObject([
      { pluginId: manifest.pluginId, version: "4.0.0", hooks: manifest.hooks, enabled: true },
    ]);
    const stored = await t.run((ctx) => ctx.db.query("pluginInstallations").unique());
    expect(stored).not.toHaveProperty("runtimeEndpoint");
    expect(stored).not.toHaveProperty("slots");
    expect(stored).not.toHaveProperty("permissions");
  });
});
