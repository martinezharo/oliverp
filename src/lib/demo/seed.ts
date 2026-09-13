/**
 * The invented business the demo starts from.
 *
 * Two projects with months of trading behind them: an electronics accessories
 * reseller and a coffee roastery. Nothing here is real, and nothing is typed
 * out row by row either — the history is simulated day by day from a fixed
 * seed, so it has the texture real data has (quiet Sundays, restock orders
 * landing in lumps, a product that was discontinued and has since sold out)
 * while staying byte-for-byte identical every time it is built.
 *
 * That determinism is not a nicety. The demo is rendered twice, once by the
 * Worker and once by the browser hydrating what it sent, and the two have to
 * agree exactly or React throws the page away and rebuilds it. The only input
 * is the UTC day the history ends on.
 */

import { cents, round2 } from "./money";
import type { DemoApiKey, DemoDataset, DemoLine, DemoPlugin } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Who the demo is signed in as. Invented, and at a domain reserved for
 * documentation, so it can never be mistaken for someone's address.
 */
export const DEMO_ACCOUNT_EMAIL = "owner@northwind.example";

/** Days of cover a restock order aims to leave on the shelf. */
const LOT_DAYS = 30;
/** Below this many days of cover, the next review orders more. */
const REORDER_DAYS = 16;
/**
 * How quickly the reorder rate follows what is actually selling. Ordering
 * against the catalogue's nominal demand instead let stock pile up to four
 * months of cover, which is not what a shop that watches its money looks
 * like on a stock screen.
 */
const RATE_MEMORY = 0.93;

/**
 * A small, fast, seeded generator. `Math.random` cannot be used: the server
 * and the browser would each get their own history.
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

type ProductSeed = {
  name: string;
  /** What one unit costs from the supplier. */
  cost: number;
  /** What it is listed at. */
  price: number;
  vatRate: number;
  /** Units sold on an average weekday, before seasonality and growth. */
  demand: number;
  /** Stopped being reordered this many days ago; it then sells out. */
  discontinuedDaysAgo?: number;
};

type OtherSeed = {
  type: "ingreso" | "gasto";
  concept: string;
  description?: string;
  amount: number;
  vatRate: number;
  /** `weekly` falls on a weekday (0 = Sunday); the rest on a day of the month. */
  cadence: "weekly" | "monthly" | "quarterly";
  on: number;
  /** Fraction the amount swings by, so a recurring cost is not a flat line. */
  jitter?: number;
};

type AdjustmentSeed = { product: number; units: number; daysAgo: number };

type ProjectSeed = {
  id: number;
  name: string;
  /** How far back this project's history runs. */
  days: number;
  seed: number;
  /** Orders on an average weekday, before seasonality and growth. */
  salesPerDay: number;
  channels: Array<{ name: string; weight: number }>;
  products: ProductSeed[];
  others: OtherSeed[];
  adjustments: AdjustmentSeed[];
};

const projectSeeds: ProjectSeed[] = [
  {
    id: 1,
    name: "Northwind Gadgets",
    days: 150,
    seed: 20_260_101,
    salesPerDay: 8,
    channels: [
      { name: "Online store", weight: 4 },
      { name: "Amazon", weight: 3 },
      { name: "eBay", weight: 2 },
      { name: "Wallapop", weight: 1 },
      { name: "Retail counter", weight: 1 },
    ],
    products: [
      { name: "Samsung BN59 TV Remote", cost: 3.2, price: 9.99, vatRate: 21, demand: 3.2 },
      { name: "LG AKB75095308 Remote", cost: 2.8, price: 8.99, vatRate: 21, demand: 2.4 },
      { name: "Sony RMT-TX300E Remote", cost: 4.5, price: 12.99, vatRate: 21, demand: 1.6 },
      { name: "Fire TV Stick Remote", cost: 1.9, price: 7.49, vatRate: 21, demand: 4 },
      // Dropped from the catalogue: the shelf empties and the stock table
      // shows what an out-of-stock line really looks like.
      { name: "Xiaomi Mi Box Remote", cost: 2.1, price: 6.99, vatRate: 21, demand: 1.2, discontinuedDaysAgo: 90 },
      { name: "Universal Remote 4-in-1", cost: 5.4, price: 15.99, vatRate: 21, demand: 2 },
      { name: "HDMI 2.1 Cable 2 m", cost: 2.3, price: 8.49, vatRate: 21, demand: 3.6 },
      { name: "USB-C Wall Charger 30 W", cost: 6.1, price: 17.99, vatRate: 21, demand: 2.2 },
    ],
    others: [
      { type: "gasto", concept: "Marketplace fees", description: "Amazon and eBay selling fees.", amount: 38.4, vatRate: 21, cadence: "weekly", on: 1, jitter: 0.4 },
      { type: "gasto", concept: "Shipping supplies", description: "Boxes, filler and labels.", amount: 24.9, vatRate: 21, cadence: "weekly", on: 5, jitter: 0.5 },
      { type: "ingreso", concept: "Shipping charged to customers", amount: 46, vatRate: 21, cadence: "weekly", on: 3, jitter: 0.35 },
      { type: "gasto", concept: "Warehouse rent", amount: 480, vatRate: 21, cadence: "monthly", on: 1 },
      { type: "gasto", concept: "Accounting software", amount: 29.9, vatRate: 21, cadence: "monthly", on: 3 },
      { type: "gasto", concept: "Utilities", amount: 86.5, vatRate: 21, cadence: "monthly", on: 12, jitter: 0.25 },
      { type: "ingreso", concept: "Supplier rebate", description: "Volume rebate on remote controls.", amount: 120, vatRate: 21, cadence: "monthly", on: 20, jitter: 0.3 },
      // Insurance premiums carry no VAT, which is why this one is recorded at 0%.
      { type: "gasto", concept: "Business insurance", amount: 210, vatRate: 0, cadence: "quarterly", on: 5 },
    ],
    adjustments: [
      { product: 1, units: -2, daysAgo: 26 },
      { product: 7, units: 4, daysAgo: 12 },
    ],
  },
  {
    id: 2,
    name: "Blue Harbor Coffee",
    days: 100,
    seed: 20_260_202,
    salesPerDay: 10,
    channels: [
      { name: "Retail counter", weight: 4 },
      { name: "Online store", weight: 2 },
      { name: "Farmers market", weight: 2 },
      { name: "Wholesale", weight: 1 },
    ],
    products: [
      // Roasted coffee is taxed at the reduced rate; the hardware is not, so
      // the VAT panels show a mix rather than one rate everywhere.
      { name: "Harbor Blend 250 g", cost: 3.6, price: 10.5, vatRate: 10, demand: 3 },
      { name: "Single Origin Ethiopia 250 g", cost: 4.9, price: 14.5, vatRate: 10, demand: 1.6 },
      { name: "Decaf Colombia 250 g", cost: 4.3, price: 12.9, vatRate: 10, demand: 1 },
      { name: "Cold Brew Bottle 500 ml", cost: 1.2, price: 3.9, vatRate: 10, demand: 2.4 },
      { name: "Paper Filters 100 pack", cost: 1.1, price: 4.5, vatRate: 21, demand: 0.8 },
      { name: "Ceramic Pour-Over Dripper", cost: 7.2, price: 22, vatRate: 21, demand: 0.4 },
    ],
    others: [
      { type: "gasto", concept: "Market stall fee", amount: 45, vatRate: 21, cadence: "weekly", on: 6 },
      { type: "gasto", concept: "Cafe rent", amount: 620, vatRate: 21, cadence: "monthly", on: 1 },
      { type: "gasto", concept: "Green coffee freight", amount: 140, vatRate: 21, cadence: "monthly", on: 8, jitter: 0.3 },
      { type: "gasto", concept: "Utilities", amount: 95, vatRate: 21, cadence: "monthly", on: 15, jitter: 0.2 },
      { type: "ingreso", concept: "Barista workshop", description: "Saturday tasting session.", amount: 180, vatRate: 21, cadence: "monthly", on: 22 },
    ],
    adjustments: [{ product: 4, units: -6, daysAgo: 9 }],
  },
];

/** `YYYY-MM-DD` for a moment already anchored to UTC. */
function dayOf(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function weighted<T extends { weight: number }>(rng: Rng, options: T[]): T {
  const total = options.reduce((sum, option) => sum + option.weight, 0);
  let ticket = rng() * total;
  for (const option of options) {
    ticket -= option.weight;
    if (ticket <= 0) return option;
  }
  return options[options.length - 1];
}

/** Swings an amount either side of its nominal value. */
function jittered(rng: Rng, amount: number, spread = 0): number {
  return round2(amount * (1 + (rng() - 0.5) * spread));
}

function isDue(entry: OtherSeed, ms: number): boolean {
  const date = new Date(ms);
  if (entry.cadence === "weekly") return date.getUTCDay() === entry.on;
  if (entry.cadence === "monthly") return date.getUTCDate() === entry.on;
  return date.getUTCDate() === entry.on && date.getUTCMonth() % 3 === 0;
}

type SimulatedProduct = ProductSeed & {
  id: number;
  stock: number;
  /** Units a day, as recent sales have it rather than as the seed guessed. */
  rate: number;
  /** Units sold today, folded into `rate` at the end of the day. */
  soldToday: number;
};

/** Trades one project for its whole history, appending to the dataset. */
function simulate(config: ProjectSeed, anchorMs: number, into: DemoDataset): void {
  const rng = mulberry32(config.seed);
  // An order carries about 1.3 lines of about 1.3 units, so this is roughly
  // what the day's orders will ask for; from the first week on, the rates are
  // driven by what actually sold.
  const totalDemand = config.products.reduce((sum, product) => sum + product.demand, 0);
  const unitsPerDay = config.salesPerDay * 1.7;
  const products: SimulatedProduct[] = config.products.map((product, index) => ({
    ...product,
    id: index + 1,
    stock: 0,
    rate: (unitsPerDay * product.demand) / totalDemand,
    soldToday: 0,
  }));

  into.projects.push({ id: config.id, name: config.name, active: true });
  for (const product of products) {
    into.products.push({ id: product.id, projectId: config.id, name: product.name });
  }

  let saleId = 0;
  let purchaseId = 0;
  let otherId = 0;
  let adjustmentId = 0;

  for (let daysAgo = config.days; daysAgo >= 0; daysAgo--) {
    const ms = anchorMs - daysAgo * DAY_MS;
    const date = dayOf(ms);
    const weekday = new Date(ms).getUTCDay();
    const opening = daysAgo === config.days;

    // ── Restocking ────────────────────────────────────────
    // Each product is reviewed on its own weekday, so orders arrive in a few
    // lumpy supplier invoices rather than as a trickle of one-line purchases.
    const restock: DemoLine[] = [];
    for (const product of products) {
      const discontinued = product.discontinuedDaysAgo !== undefined && daysAgo < product.discontinuedDaysAgo;
      if (discontinued) continue;
      if (!opening && weekday !== 1 + (product.id % 5)) continue;
      if (!opening && product.stock > product.rate * REORDER_DAYS) continue;
      const units = Math.max(5, Math.round((product.rate * LOT_DAYS) / 5) * 5);
      product.stock += units;
      restock.push({
        productId: product.id,
        units,
        unitPriceCents: cents(jittered(rng, product.cost, 0.08)),
        vatRate: product.vatRate,
      });
    }
    if (restock.length) {
      into.purchases.push({ id: ++purchaseId, projectId: config.id, date, lines: restock });
    }

    // ── Corrections ───────────────────────────────────────
    for (const adjustment of config.adjustments) {
      if (adjustment.daysAgo !== daysAgo) continue;
      const product = products[adjustment.product - 1];
      if (!product || product.stock + adjustment.units < 0) continue;
      product.stock += adjustment.units;
      into.adjustments.push({
        id: ++adjustmentId,
        projectId: config.id,
        productId: product.id,
        units: adjustment.units,
        date,
      });
    }

    // ── Sales ─────────────────────────────────────────────
    // Sundays are quiet, Saturdays half-quiet, and the business grows a little
    // over the window so the projection card has a trend to lean on.
    const seasonal = weekday === 0 ? 0.45 : weekday === 6 ? 0.7 : 1;
    const growth = 0.8 + 0.45 * (1 - daysAgo / config.days);
    const orders = Math.round(config.salesPerDay * seasonal * growth * (0.6 + rng() * 0.8));
    for (let order = 0; order < orders; order++) {
      const channel = weighted(rng, config.channels).name;
      const wanted = rng() < 0.28 ? 2 : 1;
      const lines: DemoLine[] = [];
      for (let line = 0; line < wanted; line++) {
        const available = products.filter(
          (product) => product.stock > 0 && !lines.some((chosen) => chosen.productId === product.id),
        );
        if (!available.length) break;
        const product = weighted(rng, available.map((item) => ({ item, weight: item.demand }))).item;
        const asked = rng() < 0.78 ? 1 : rng() < 0.8 ? 2 : 3;
        const units = Math.min(asked, product.stock);
        product.stock -= units;
        product.soldToday += units;
        const discount = rng() < 0.15 ? 0.88 + rng() * 0.08 : 1;
        lines.push({
          productId: product.id,
          units,
          unitPriceCents: cents(round2(product.price * discount)),
          vatRate: product.vatRate,
        });
      }
      if (lines.length) {
        into.sales.push({ id: ++saleId, projectId: config.id, date, channel, lines });
      }
    }

    // Today's sales become tomorrow's reorder rate.
    for (const product of products) {
      product.rate = product.rate * RATE_MEMORY + product.soldToday * (1 - RATE_MEMORY);
      product.soldToday = 0;
    }

    // ── Everything that is not a product ──────────────────
    for (const entry of config.others) {
      if (!isDue(entry, ms)) continue;
      into.others.push({
        id: ++otherId,
        projectId: config.id,
        type: entry.type,
        concept: entry.concept,
        description: entry.description ?? null,
        amountCents: cents(jittered(rng, entry.amount, entry.jitter ?? 0)),
        vatRate: entry.vatRate,
        date,
      });
    }
  }
}

/**
 * The keys the settings screen lists. Only a key's prefix is ever stored in
 * the clear by the real application, so sample ones give nothing away.
 */
function seedApiKeys(anchorMs: number): DemoApiKey[] {
  const at = (daysAgo: number) => new Date(anchorMs - daysAgo * DAY_MS).toISOString();
  return [
    {
      projectId: 1,
      id: "demo-key-1",
      nombre: "n8n automation",
      prefijo: "erp_sk_4f2a9c",
      scopes: ["read", "write"],
      activa: true,
      expira_en: null,
      ultimo_uso_en: at(1),
      creada_en: at(96),
    },
    {
      projectId: 1,
      id: "demo-key-2",
      nombre: "Reporting script",
      prefijo: "erp_sk_7b3d10",
      scopes: ["read"],
      activa: true,
      expira_en: at(-24),
      ultimo_uso_en: at(6),
      creada_en: at(40),
    },
    {
      projectId: 2,
      id: "demo-key-3",
      nombre: "Till integration",
      prefijo: "erp_sk_c81e55",
      scopes: ["read", "write"],
      activa: true,
      expira_en: null,
      ultimo_uso_en: null,
      creada_en: at(18),
    },
  ];
}

/**
 * One installed plugin, enabled, with a hook that genuinely changes the
 * numbers: marketplace fees stop counting as an expense while their VAT is
 * still reclaimed. Turning it off on the plugins screen moves the dashboard.
 */
function seedPlugins(anchorMs: number): DemoPlugin[] {
  return [
    {
      projectId: 1,
      pluginId: "marketplace-fee-vat",
      name: "Marketplace Fee VAT",
      description: "Keeps marketplace fees out of the expense column while still reclaiming the VAT they carry.",
      version: "1.3.0",
      repositoryUrl: "https://github.com/oliverp-plugins/marketplace-fee-vat",
      sourceSha: "9f1c2ab74d0e5c6318bb2a41f0d7e9c5a8b31d47",
      hooks: [{ type: "finance.other_transaction.vat_only", concept: "Marketplace fees" }],
      enabled: true,
      installedAt: new Date(anchorMs - 62 * DAY_MS).toISOString(),
    },
  ];
}

/** Builds the whole sample business for a history ending on `day`. */
export function buildDataset(day: string): DemoDataset {
  const anchorMs = Date.parse(`${day}T00:00:00.000Z`);
  const dataset: DemoDataset = {
    day,
    projects: [],
    products: [],
    sales: [],
    purchases: [],
    others: [],
    adjustments: [],
    apiKeys: seedApiKeys(anchorMs),
    plugins: seedPlugins(anchorMs),
  };

  for (const config of projectSeeds) simulate(config, anchorMs, dataset);
  return dataset;
}
