import { describe, expect, it } from "vitest";

import { githubRepository, installArgs, pluginManifestSchema } from "@/lib/plugins";

describe("plugin manifests", () => {
  it("normalizes supported GitHub repository URLs", () => {
    expect(githubRepository("https://github.com/example/my-plugin.git/tree/main")).toEqual({
      owner: "example",
      repo: "my-plugin",
      url: "https://github.com/example/my-plugin",
    });
    expect(githubRepository("https://gitlab.com/example/my-plugin")).toBeNull();
  });

  it("accepts reviewed finance hooks and rejects runtime or UI capabilities", () => {
    const base = {
      schemaVersion: 1 as const,
      id: "com.example.vat",
      name: "VAT",
      description: "VAT-only movements",
      version: "1.0.0",
      hooks: [{ type: "finance.other_transaction.vat_only" as const, concept: "solo_iva" }],
    };
    expect(pluginManifestSchema.safeParse(base).success).toBe(true);
    expect(pluginManifestSchema.safeParse({ ...base, runtime: { endpoint: "https://plugin.example.com" } }).success).toBe(false);
    expect(pluginManifestSchema.safeParse({ ...base, slots: ["dashboard.summary"] }).success).toBe(false);
    expect(pluginManifestSchema.safeParse({ ...base, hooks: [{ type: "unknown", concept: "solo_iva" }] }).success).toBe(false);
    expect(pluginManifestSchema.safeParse({ ...base, hooks: [...base.hooks, ...base.hooks] }).success).toBe(false);
  });

  it("maps a reviewed manifest to the Convex installation contract", () => {
    expect(installArgs(9, {
      schemaVersion: 1,
      id: "com.example.vat",
      name: "VAT",
      description: "VAT-only movements",
      version: "1.0.0",
      hooks: [{ type: "finance.other_transaction.vat_only", concept: "solo_iva" }],
      repositoryUrl: "https://github.com/example/vat",
      sourceSha: "0123456789abcdef0123456789abcdef01234567",
    })).toMatchObject({
      projectLegacyId: 9,
      pluginId: "com.example.vat",
      hooks: [{ type: "finance.other_transaction.vat_only", concept: "solo_iva" }],
    });
  });
});
