/**
 * Renders the PWA icon set from the one brand mark in `public/icon.svg`.
 *
 * The mark is a white glyph on nothing: the sidebar and the landing header put
 * it on a gradient tile drawn in CSS (`components/ui/Logo.tsx`), and an
 * installed application needs that same tile baked into a real bitmap. Rather
 * than keep a second, hand-drawn copy of the logo in a binary file that nobody
 * can review in a diff, the tile is composed here in a headless browser — the
 * gradient is the literal CSS the application uses, oklch and all — and the
 * PNGs are written next to it.
 *
 * Run it after changing the mark or the brand colours:
 *
 *     node scripts/generate-icons.mjs
 *
 * The output is committed, because the build has no browser available and the
 * icons have to exist as static assets.
 */

import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = join(root, "public", "icons");

/** `from-primary-500 to-indigo-600`, the tile behind the mark everywhere else. */
const GRADIENT = "linear-gradient(to bottom right, oklch(0.61 0.19 245.8), #4f46e5)";

/**
 * `any` icons keep the rounded tile and transparent corners, which is how a
 * launcher or a browser tab expects to receive them. `maskable` fills the
 * whole canvas instead and shrinks the glyph into the 80% safe zone, because
 * the platform crops it to a shape of its own choosing. Apple crops too, but
 * refuses transparency, so its icon is square and full-bleed.
 */
const ICONS = [
  { file: "icon-192.png", size: 192, radius: 0.22, glyph: 0.56 },
  { file: "icon-512.png", size: 512, radius: 0.22, glyph: 0.56 },
  { file: "icon-maskable-512.png", size: 512, radius: 0, glyph: 0.44 },
  { file: "apple-touch-icon.png", size: 180, radius: 0, glyph: 0.56 },
];

function page(mark, { size, radius, glyph }) {
  return `<!doctype html><meta charset="utf-8"><style>
    html, body { margin: 0; background: transparent; }
    .tile {
      width: ${size}px; height: ${size}px;
      border-radius: ${Math.round(size * radius)}px;
      background: ${GRADIENT};
      display: flex; align-items: center; justify-content: center;
    }
    .tile svg { width: ${Math.round(size * glyph)}px; height: ${Math.round(size * glyph)}px; }
  </style><div class="tile">${mark}</div>`;
}

const mark = await readFile(join(root, "public", "icon.svg"), "utf8");

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch();
try {
  for (const icon of ICONS) {
    const context = await browser.newContext({
      viewport: { width: icon.size, height: icon.size },
      deviceScaleFactor: 1,
    });
    const tab = await context.newPage();
    await tab.setContent(page(mark, icon), { waitUntil: "load" });
    const png = await tab.locator(".tile").screenshot({ omitBackground: true });
    await writeFile(join(outputDirectory, icon.file), png);
    await context.close();
    console.log(`public/icons/${icon.file}  ${icon.size}×${icon.size}`);
  }
} finally {
  await browser.close();
}
