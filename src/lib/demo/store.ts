/**
 * The demo's data, and the only place it changes.
 *
 * Demo mode is a working application, not a screenshot: sales, purchases,
 * entries, products, projects, keys and plugins can all be created, edited and
 * deleted. The records live here, in memory, for as long as the tab is open —
 * nothing is written to a server, to the account of whoever is looking, or to
 * browser storage, so a reload hands the next visitor the same untouched
 * sample business.
 *
 * Views subscribe through `useDemoDataset`. Every mutation replaces the
 * dataset object rather than editing it in place, which is what lets the
 * derivations in `domain.ts` be memoised on it: one saved sale repaints the
 * dashboard, the stock table and the transaction list together.
 */

import { nextId } from "./domain";
import { cents } from "./money";
import { buildDataset } from "./seed";
import type {
  DemoApiKey,
  DemoDataset,
  DemoLine,
  DemoPlugin,
  DemoProject,
} from "./types";
import type { PluginHook } from "@/lib/plugins";

/** Today as a UTC day, the anchor the sample history is built from. */
function utcDay(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

/**
 * The live dataset.
 *
 * Module state is shared by every request a Worker serves, which would be a
 * leak if it could hold one visitor's edits — it cannot: mutations only ever
 * run from a browser event handler, so on the server this stays the untouched
 * seed and every render produces the same HTML.
 */
let dataset: DemoDataset | null = null;
let edited = false;
const listeners = new Set<() => void>();

export function demoDataset(): DemoDataset {
  const day = utcDay();
  // A Worker can stay warm for days; rebuilding when the day turns keeps "the
  // last quarter" true. An edited dataset is left alone: the visitor's own
  // sale disappearing at midnight would be worse than a day-old history.
  if (!dataset || (!edited && dataset.day !== day)) dataset = buildDataset(day);
  return dataset;
}

export function subscribeDemo(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function commit(change: (current: DemoDataset) => DemoDataset): void {
  dataset = change(demoDataset());
  edited = true;
  for (const listener of [...listeners]) listener();
}

/** Discards every edit and puts the sample business back as it was. */
export function resetDemo(): void {
  dataset = buildDataset(utcDay());
  edited = false;
  for (const listener of [...listeners]) listener();
}

// ── Orders ──────────────────────────────────────────────────

/** A line as the operation forms submit it, in euros. */
export type LineInput = { productId: number; units: number; unitPrice: number; vatRate: number };

function toLines(items: LineInput[]): DemoLine[] {
  return items.map((item) => ({
    productId: item.productId,
    units: item.units,
    unitPriceCents: cents(item.unitPrice),
    vatRate: item.vatRate,
  }));
}

export function createSale(input: {
  projectId: number;
  date: string;
  channel: string;
  items: LineInput[];
}): number {
  const id = nextId(demoDataset().sales, input.projectId);
  commit((current) => ({
    ...current,
    sales: [
      ...current.sales,
      {
        id,
        projectId: input.projectId,
        date: input.date,
        channel: input.channel,
        lines: toLines(input.items),
      },
    ],
  }));
  return id;
}

export function updateSale(input: {
  projectId: number;
  id: number;
  date: string;
  channel: string;
  items: LineInput[];
}): boolean {
  let found = false;
  commit((current) => ({
    ...current,
    sales: current.sales.map((sale) => {
      if (sale.projectId !== input.projectId || sale.id !== input.id) return sale;
      found = true;
      return { ...sale, date: input.date, channel: input.channel, lines: toLines(input.items) };
    }),
  }));
  return found;
}

export function createPurchase(input: {
  projectId: number;
  date: string;
  items: LineInput[];
}): number {
  const id = nextId(demoDataset().purchases, input.projectId);
  commit((current) => ({
    ...current,
    purchases: [
      ...current.purchases,
      { id, projectId: input.projectId, date: input.date, lines: toLines(input.items) },
    ],
  }));
  return id;
}

export function updatePurchase(input: {
  projectId: number;
  id: number;
  date: string;
  items: LineInput[];
}): boolean {
  let found = false;
  commit((current) => ({
    ...current,
    purchases: current.purchases.map((purchase) => {
      if (purchase.projectId !== input.projectId || purchase.id !== input.id) return purchase;
      found = true;
      return { ...purchase, date: input.date, lines: toLines(input.items) };
    }),
  }));
  return found;
}

export function saveOther(input: {
  projectId: number;
  id?: number;
  type: "ingreso" | "gasto";
  date: string;
  concept: string;
  description?: string | null;
  amount: number;
  vatRate: number;
}): number {
  const id = input.id ?? nextId(demoDataset().others, input.projectId);
  const values = {
    id,
    projectId: input.projectId,
    type: input.type,
    concept: input.concept,
    description: input.description?.trim() ? input.description : null,
    amountCents: cents(input.amount),
    vatRate: input.vatRate,
    date: input.date,
  };

  commit((current) => {
    const exists = current.others.some((row) => row.projectId === input.projectId && row.id === id);
    return {
      ...current,
      others: exists
        ? current.others.map((row) =>
            row.projectId === input.projectId && row.id === id ? values : row,
          )
        : [...current.others, values],
    };
  });
  return id;
}

export function deleteTransaction(projectId: number, id: number, type: string): boolean {
  const current = demoDataset();
  const matches = (row: { id: number; projectId: number }) =>
    row.projectId === projectId && row.id === id;

  if (type === "venta") {
    if (!current.sales.some(matches)) return false;
    commit((state) => ({ ...state, sales: state.sales.filter((row) => !matches(row)) }));
    return true;
  }
  if (type === "compra") {
    if (!current.purchases.some(matches)) return false;
    commit((state) => ({ ...state, purchases: state.purchases.filter((row) => !matches(row)) }));
    return true;
  }
  if (!current.others.some(matches)) return false;
  commit((state) => ({ ...state, others: state.others.filter((row) => !matches(row)) }));
  return true;
}

// ── Catalogue and stock ─────────────────────────────────────

export function createProduct(projectId: number, name: string): { id: number; nombre: string } {
  const id = nextId(demoDataset().products, projectId);
  commit((current) => ({
    ...current,
    products: [...current.products, { id, projectId, name: name.trim() }],
  }));
  return { id, nombre: name.trim() };
}

export function adjustStock(input: {
  projectId: number;
  productId: number;
  units: number;
  date: string;
}): { id: number; producto_id: number; unidades: number; tipo_movimiento: string; fecha: string } {
  const id = nextId(demoDataset().adjustments, input.projectId);
  commit((current) => ({
    ...current,
    adjustments: [
      ...current.adjustments,
      {
        id,
        projectId: input.projectId,
        productId: input.productId,
        units: input.units,
        date: input.date,
      },
    ],
  }));
  return {
    id,
    producto_id: input.productId,
    unidades: input.units,
    tipo_movimiento: "ajuste manual",
    fecha: input.date,
  };
}

// ── Projects ────────────────────────────────────────────────

export function createProject(name: string): DemoProject {
  const current = demoDataset();
  const id = current.projects.reduce((top, project) => Math.max(top, project.id), 0) + 1;
  const project: DemoProject = { id, name: name.trim(), active: true };
  commit((state) => ({ ...state, projects: [...state.projects, project] }));
  return project;
}

/** Removes a project and everything recorded against it. */
export function deleteProject(projectId: number): boolean {
  if (!demoDataset().projects.some((project) => project.id === projectId)) return false;
  const keep = <T extends { projectId: number }>(rows: T[]) =>
    rows.filter((row) => row.projectId !== projectId);

  commit((current) => ({
    ...current,
    projects: current.projects.filter((project) => project.id !== projectId),
    products: keep(current.products),
    sales: keep(current.sales),
    purchases: keep(current.purchases),
    others: keep(current.others),
    adjustments: keep(current.adjustments),
    apiKeys: keep(current.apiKeys),
    plugins: keep(current.plugins),
  }));
  return true;
}

// ── API keys ────────────────────────────────────────────────

/**
 * Mints a sample key. The secret is random because the screen's whole point is
 * that a key is shown once and never again, and a fixed string would teach the
 * opposite; it authenticates nothing, here or anywhere.
 */
export function createApiKey(input: {
  projectId: number;
  name: string;
  scopes: Array<"read" | "write">;
  expiresAt?: string;
}): { row: DemoApiKey; key: string } {
  const secret = Array.from({ length: 32 }, () =>
    "abcdefghijklmnopqrstuvwxyz0123456789".charAt(Math.floor(Math.random() * 36)),
  ).join("");
  const prefix = `erp_sk_${secret.slice(0, 6)}`;
  const row: DemoApiKey = {
    projectId: input.projectId,
    id: `demo-key-${Date.now()}`,
    nombre: input.name,
    prefijo: prefix,
    scopes: input.scopes,
    activa: true,
    expira_en: input.expiresAt ?? null,
    ultimo_uso_en: null,
    creada_en: new Date().toISOString(),
  };

  commit((current) => ({ ...current, apiKeys: [...current.apiKeys, row] }));
  return { row, key: `${prefix}_${secret.slice(6)}` };
}

export function revokeApiKey(keyId: string): boolean {
  if (!demoDataset().apiKeys.some((key) => key.id === keyId)) return false;
  commit((current) => ({
    ...current,
    apiKeys: current.apiKeys.filter((key) => key.id !== keyId),
  }));
  return true;
}

// ── Plugins ─────────────────────────────────────────────────

export function installPlugin(input: {
  projectLegacyId: number;
  pluginId: string;
  name: string;
  description: string;
  version: string;
  repositoryUrl: string;
  sourceSha: string;
  hooks: PluginHook[];
}): void {
  const installation: DemoPlugin = {
    projectId: input.projectLegacyId,
    pluginId: input.pluginId,
    name: input.name,
    description: input.description,
    version: input.version,
    repositoryUrl: input.repositoryUrl,
    sourceSha: input.sourceSha,
    hooks: input.hooks,
    enabled: true,
    installedAt: new Date().toISOString(),
  };

  commit((current) => ({
    ...current,
    plugins: [
      ...current.plugins.filter(
        (plugin) =>
          plugin.projectId !== input.projectLegacyId || plugin.pluginId !== input.pluginId,
      ),
      installation,
    ],
  }));
}

export function uninstallPlugin(projectId: number, pluginId: string): void {
  commit((current) => ({
    ...current,
    plugins: current.plugins.filter(
      (plugin) => plugin.projectId !== projectId || plugin.pluginId !== pluginId,
    ),
  }));
}

export function setPluginEnabled(projectId: number, pluginId: string, enabled: boolean): void {
  commit((current) => ({
    ...current,
    plugins: current.plugins.map((plugin) =>
      plugin.projectId === projectId && plugin.pluginId === pluginId
        ? { ...plugin, enabled }
        : plugin,
    ),
  }));
}
