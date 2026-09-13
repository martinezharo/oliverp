/**
 * The shape of the sample business demo mode keeps in memory.
 *
 * It is deliberately the same shape the Convex tables have — orders with
 * lines, manual entries, stock adjustments — rather than the flattened rows
 * the screens render. Everything the views read (daily finances, stock,
 * transactions, movements) is derived from these records by `domain.ts`, in
 * the same way the backend derives them, so recording a sale in the demo
 * moves the dashboard, the stock table and the history exactly as it would
 * against a real account.
 */

import type { PluginHook } from "@/lib/plugins";
import type { ApiKeyRow } from "@/types/erp";

/** One line of a sale or a purchase. */
export type DemoLine = {
  productId: number;
  units: number;
  unitPriceCents: number;
  vatRate: number;
};

export type DemoProject = { id: number; name: string; active: boolean };

export type DemoProduct = { id: number; projectId: number; name: string };

export type DemoSale = {
  id: number;
  projectId: number;
  /** `YYYY-MM-DD`, the shape every date input and API field uses. */
  date: string;
  channel: string;
  lines: DemoLine[];
};

export type DemoPurchase = {
  id: number;
  projectId: number;
  date: string;
  lines: DemoLine[];
};

/** Income and expenses that are not tied to a product. */
export type DemoOther = {
  id: number;
  projectId: number;
  type: "ingreso" | "gasto";
  concept: string;
  description: string | null;
  amountCents: number;
  vatRate: number;
  date: string;
};

/** A stock correction: a count, a breakage, a return that never was a sale. */
export type DemoAdjustment = {
  id: number;
  projectId: number;
  productId: number;
  units: number;
  date: string;
};

export type DemoApiKey = ApiKeyRow & { projectId: number };

export type DemoPlugin = {
  projectId: number;
  pluginId: string;
  name: string;
  description: string;
  version: string;
  repositoryUrl: string;
  sourceSha: string;
  hooks: PluginHook[];
  enabled: boolean;
  installedAt: string;
};

export type DemoDataset = {
  /**
   * The UTC day the sample history ends on. Held here so a Worker that stays
   * warm past midnight can notice its data has gone stale, and so every
   * derivation can date itself from the same instant on the server and in the
   * browser instead of from two slightly different `Date.now()`s.
   */
  day: string;
  projects: DemoProject[];
  products: DemoProduct[];
  sales: DemoSale[];
  purchases: DemoPurchase[];
  others: DemoOther[];
  adjustments: DemoAdjustment[];
  apiKeys: DemoApiKey[];
  plugins: DemoPlugin[];
};
