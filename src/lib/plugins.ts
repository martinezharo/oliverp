import { z } from "zod";

export const pluginEffectSchema = z.enum(["dashboard.solo_iva"]);

export const pluginManifestSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9](?:[a-z0-9.-]{1,78}[a-z0-9])?$/),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300),
  version: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/),
  effects: z.array(pluginEffectSchema).min(1).max(8).refine(
    (effects) => new Set(effects).size === effects.length,
    "Effects cannot be repeated.",
  ),
}).strict();

export type PluginEffect = z.infer<typeof pluginEffectSchema>;
export type PluginManifest = z.infer<typeof pluginManifestSchema>;

export type ResolvedPlugin = PluginManifest & {
  repositoryUrl: string;
  sourceSha: string;
};

export type PluginInstallation = {
  pluginId: string;
  name: string;
  description: string;
  version: string;
  repositoryUrl: string;
  sourceSha: string;
  effects: PluginEffect[];
  enabled: boolean;
  installedAt: string;
};

export function githubRepository(value: string): { owner: string; repo: string; url: string } | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com") return null;
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;
  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, "");
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) return null;
  return { owner, repo, url: `https://github.com/${owner}/${repo}` };
}

export function installArgs(projectLegacyId: number, plugin: ResolvedPlugin) {
  return {
    projectLegacyId,
    pluginId: plugin.id,
    name: plugin.name,
    description: plugin.description,
    version: plugin.version,
    repositoryUrl: plugin.repositoryUrl,
    sourceSha: plugin.sourceSha,
    effects: plugin.effects,
  };
}
