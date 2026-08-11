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

  it("accepts a declarative effect contract and rejects executable entrypoints", () => {
    const base = {
      schemaVersion: 1 as const,
      id: "com.example.vat",
      name: "VAT",
      description: "VAT report",
      version: "1.0.0",
      effects: ["dashboard.solo_iva" as const],
    };
    expect(pluginManifestSchema.safeParse(base).success).toBe(true);
    expect(pluginManifestSchema.safeParse({ ...base, entrypoint: "https://plugin.example.com" }).success).toBe(false);
    expect(pluginManifestSchema.safeParse({ ...base, effects: ["unknown.effect"] }).success).toBe(false);
  });

  it("maps a reviewed manifest to the Convex installation contract", () => {
    expect(installArgs(9, {
      schemaVersion: 1,
      id: "com.example.vat",
      name: "VAT",
      description: "VAT report",
      version: "1.0.0",
      effects: ["dashboard.solo_iva"],
      repositoryUrl: "https://github.com/example/vat",
      sourceSha: "0123456789abcdef0123456789abcdef01234567",
    })).toMatchObject({ projectLegacyId: 9, pluginId: "com.example.vat", effects: ["dashboard.solo_iva"] });
  });
});
