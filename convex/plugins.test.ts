/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "./_generated/api";
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
  runtimeProtocol: 1 as const,
  runtimeEndpoint: "https://oliverp-plugin-solo-iva.example.workers.dev/render",
  slots: ["dashboard.summary" as const],
  permissions: ["finances:read" as const],
};

describe("plugin installations", () => {
  it("lets an admin install a project-scoped manifest", async () => {
    const t = convexTest(schema, modules);
    const { admin } = await seed(t);
    const installed = await asUser(t, admin).mutation(api.plugins.install, manifest);
    expect(installed).toMatchObject({ pluginId: manifest.pluginId, slots: ["dashboard.summary"], permissions: ["finances:read"], enabled: true });
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

  it("keeps only one enabled plugin in each host slot", async () => {
    const t = convexTest(schema, modules);
    const { admin } = await seed(t);
    await asUser(t, admin).mutation(api.plugins.install, manifest);
    await asUser(t, admin).mutation(api.plugins.install, {
      ...manifest,
      pluginId: "com.example.alternative",
      name: "Alternative dashboard",
      repositoryUrl: "https://github.com/example/alternative",
    });
    await expect(asUser(t, admin).query(api.plugins.list, { projectLegacyId: 7 })).resolves.toMatchObject([
      { pluginId: "com.example.alternative", enabled: true },
      { pluginId: manifest.pluginId, enabled: false },
    ]);
    await asUser(t, admin).mutation(api.plugins.setEnabled, { projectLegacyId: 7, pluginId: manifest.pluginId, enabled: true });
    await expect(asUser(t, admin).query(api.plugins.list, { projectLegacyId: 7 })).resolves.toMatchObject([
      { pluginId: "com.example.alternative", enabled: false },
      { pluginId: manifest.pluginId, enabled: true },
    ]);
  });

  it("revokes the installation without changing project records", async () => {
    const t = convexTest(schema, modules);
    const { admin } = await seed(t);
    await asUser(t, admin).mutation(api.plugins.install, manifest);
    await expect(asUser(t, admin).mutation(api.plugins.uninstall, { projectLegacyId: 7, pluginId: manifest.pluginId })).resolves.toEqual({ removed: true });
    await expect(asUser(t, admin).query(api.plugins.list, { projectLegacyId: 7 })).resolves.toEqual([]);
    await expect(t.run((ctx) => ctx.db.query("projects").collect())).resolves.toHaveLength(1);
  });
});
