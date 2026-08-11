import { describe, expect, it } from "vitest";

import { githubRepository, installArgs, pluginDashboardViewSchema, pluginManifestSchema } from "@/lib/plugins";

describe("plugin manifests", () => {
  it("normalizes supported GitHub repository URLs", () => {
    expect(githubRepository("https://github.com/example/my-plugin.git/tree/main")).toEqual({
      owner: "example",
      repo: "my-plugin",
      url: "https://github.com/example/my-plugin",
    });
    expect(githubRepository("https://gitlab.com/example/my-plugin")).toBeNull();
  });

  it("accepts a remote runtime contract and rejects unknown capabilities", () => {
    const base = {
      schemaVersion: 1 as const,
      id: "com.example.vat",
      name: "VAT",
      description: "VAT report",
      version: "1.0.0",
      runtime: { protocol: 1 as const, endpoint: "https://plugin.example.com/render" },
      slots: ["dashboard.summary" as const],
      permissions: ["finances:read" as const],
    };
    expect(pluginManifestSchema.safeParse(base).success).toBe(true);
    expect(pluginManifestSchema.safeParse({ ...base, entrypoint: "https://plugin.example.com" }).success).toBe(false);
    expect(pluginManifestSchema.safeParse({ ...base, slots: ["dashboard.unknown"] }).success).toBe(false);
    expect(pluginManifestSchema.safeParse({ ...base, permissions: ["projects:write"] }).success).toBe(false);
    expect(pluginManifestSchema.safeParse({ ...base, runtime: { protocol: 1, endpoint: "http://localhost/render" } }).success).toBe(false);
  });

  it("maps a reviewed manifest to the Convex installation contract", () => {
    expect(installArgs(9, {
      schemaVersion: 1,
      id: "com.example.vat",
      name: "VAT",
      description: "VAT report",
      version: "1.0.0",
      runtime: { protocol: 1, endpoint: "https://plugin.example.com/render" },
      slots: ["dashboard.summary"],
      permissions: ["finances:read"],
      repositoryUrl: "https://github.com/example/vat",
      sourceSha: "0123456789abcdef0123456789abcdef01234567",
    })).toMatchObject({
      projectLegacyId: 9,
      pluginId: "com.example.vat",
      runtimeEndpoint: "https://plugin.example.com/render",
      slots: ["dashboard.summary"],
      permissions: ["finances:read"],
    });
  });

  it("validates host-native dashboard documents", () => {
    const view = {
      protocol: 1 as const,
      plugin: { id: "com.example.vat", version: "1.0.0" },
      slot: "dashboard.summary" as const,
      title: "VAT summary",
      defaultPeriod: "year",
      periods: [{ id: "year", label: "Year", metrics: [{ label: "Output VAT", value: "€21.00", tone: "rose" as const }] }],
      table: {
        title: "Quarterly settlement",
        emptyMessage: "No VAT entries",
        columns: [{ label: "Quarter", align: "left" as const }, { label: "Amount", align: "right" as const }],
        rows: [{ cells: [{ value: "Q1" }, { value: "€21.00", tone: "rose" as const }] }],
      },
    };
    expect(pluginDashboardViewSchema.safeParse(view).success).toBe(true);
    expect(pluginDashboardViewSchema.safeParse({ ...view, defaultPeriod: "missing" }).success).toBe(false);
    expect(pluginDashboardViewSchema.safeParse({ ...view, script: "alert(1)" }).success).toBe(false);
  });
});
