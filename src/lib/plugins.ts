import { z } from "zod";

export const pluginSlotSchema = z.enum(["dashboard.summary"]);
export const pluginPermissionSchema = z.enum(["finances:read"]);

export const pluginManifestSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9](?:[a-z0-9.-]{1,78}[a-z0-9])?$/),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300),
  version: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/),
  runtime: z.object({
    protocol: z.literal(1),
    endpoint: z.string().url().refine((value) => value.startsWith("https://"), "Runtime endpoint must use HTTPS."),
  }).strict(),
  slots: z.array(pluginSlotSchema).min(1).max(8).refine(
    (slots) => new Set(slots).size === slots.length,
    "Slots cannot be repeated.",
  ),
  permissions: z.array(pluginPermissionSchema).min(1).max(8).refine(
    (permissions) => new Set(permissions).size === permissions.length,
    "Permissions cannot be repeated.",
  ),
}).strict();

const shortText = z.string().trim().min(1).max(120);
const tone = z.enum(["neutral", "primary", "rose", "emerald", "amber"]);

export const pluginDashboardViewSchema = z.object({
  protocol: z.literal(1),
  plugin: z.object({ id: z.string(), version: z.string() }).strict(),
  slot: z.literal("dashboard.summary"),
  eyebrow: shortText.optional(),
  title: shortText,
  description: z.string().trim().max(240).optional(),
  defaultPeriod: z.string().min(1).max(32),
  periods: z.array(z.object({
    id: z.string().min(1).max(32),
    label: shortText,
    metrics: z.array(z.object({
      label: shortText,
      value: shortText,
      detail: z.string().trim().max(160).optional(),
      tone,
    }).strict()).min(1).max(6),
  }).strict()).min(1).max(8),
  table: z.object({
    title: shortText,
    caption: z.string().trim().max(120).optional(),
    emptyMessage: z.string().trim().max(180),
    columns: z.array(z.object({ label: shortText, align: z.enum(["left", "right"]) }).strict()).min(1).max(8),
    rows: z.array(z.object({
      cells: z.array(z.object({ value: shortText, tone: tone.optional() }).strict()).min(1).max(8),
    }).strict()).max(200),
  }).strict(),
}).strict().superRefine((view, context) => {
  if (!view.periods.some((period) => period.id === view.defaultPeriod)) {
    context.addIssue({ code: "custom", path: ["defaultPeriod"], message: "Default period is not available." });
  }
  for (const [index, row] of view.table.rows.entries()) {
    if (row.cells.length !== view.table.columns.length) {
      context.addIssue({ code: "custom", path: ["table", "rows", index, "cells"], message: "Cell count must match column count." });
    }
  }
});

export type PluginSlot = z.infer<typeof pluginSlotSchema>;
export type PluginPermission = z.infer<typeof pluginPermissionSchema>;
export type PluginManifest = z.infer<typeof pluginManifestSchema>;
export type PluginDashboardView = z.infer<typeof pluginDashboardViewSchema>;

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
  runtimeProtocol: 1;
  runtimeEndpoint: string;
  slots: PluginSlot[];
  permissions: PluginPermission[];
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
    runtimeProtocol: plugin.runtime.protocol,
    runtimeEndpoint: plugin.runtime.endpoint,
    slots: plugin.slots,
    permissions: plugin.permissions,
  };
}
