/**
 * Mock data for the explicit, read-only Demo Mode.
 */

import type { Project } from "@/hooks/useErpContext";
import type { ApiKeyRow, FinanceRow, StockRow } from "@/types/erp";

type MockFinanceRow = FinanceRow & { nombre_proyecto: string };
type MockStockRow = StockRow & { nombre_proyecto: string };

// ── Translation keys for mock product/project names ───────
const productNameTranslationKeys: Record<string, string> = {
    "Mando Samsung BN59": "product.mando_samsung_bn59",
    "Mando LG AKB75095308": "product.mando_lg_akb75095308",
    "Mando Sony RMT-TX300E": "product.mando_sony_rmt_tx300e",
    "Mando Fire TV Stick": "product.mando_fire_tv_stick",
    "Mando Xiaomi Mi Box": "product.mando_xiaomi_mi_box",
};

const projectNameTranslationKeys: Record<string, string> = {
    "Octopus Control": "project.octopus_control",
    "Demo Store": "project.demo_store",
};

export function getProductNameKey(name: string): string {
    return productNameTranslationKeys[name] || name;
}

export function getProjectNameKey(name: string): string {
    return projectNameTranslationKeys[name] || name;
}

// ── Projects ──────────────────────────────────────────────
export const mockProjects: Project[] = [
    { id: 1, nombre: "Octopus Control", activo: true },
    { id: 2, nombre: "Demo Store", activo: true },
];

// ── API keys ──────────────────────────────────────────────
/**
 * One plausible key so demo mode shows the management screen as it really
 * looks. The prefix is the only part of a key that is ever stored in the
 * clear, so a sample one gives nothing away.
 */
export const mockApiKeys: ApiKeyRow[] = [
    {
        id: "demo-key-1",
        nombre: "n8n",
        prefijo: "erp_sk_4f2a9c",
        scopes: ["read", "write"],
        activa: true,
        expira_en: null,
        ultimo_uso_en: "2026-08-11T09:12:00.000Z",
        creada_en: "2026-06-02T10:00:00.000Z",
    },
];

// ── Stock ─────────────────────────────────────────────────
export const mockStock: MockStockRow[] = [
    {
        proyecto_id: 1,
        nombre_proyecto: "Octopus Control",
        producto_id: 1,
        nombre_producto: "Mando Samsung BN59",
        stock_actual: 48,
        coste_ud: 3.2,
        venta_ud: 9.99,
        num_ventas_30d: 22,
        beneficio_ud: 6.79,
        beneficio_total_30d: 149.38,
        valor_stock: 153.6,
        venta_diaria_promedio: 0.73,
        dias_stock_restante: 66,
    },
    {
        proyecto_id: 1,
        nombre_proyecto: "Octopus Control",
        producto_id: 2,
        nombre_producto: "Mando LG AKB75095308",
        stock_actual: 35,
        coste_ud: 2.8,
        venta_ud: 8.99,
        num_ventas_30d: 18,
        beneficio_ud: 6.19,
        beneficio_total_30d: 111.42,
        valor_stock: 98.0,
        venta_diaria_promedio: 0.6,
        dias_stock_restante: 58,
    },
    {
        proyecto_id: 1,
        nombre_proyecto: "Octopus Control",
        producto_id: 3,
        nombre_producto: "Mando Sony RMT-TX300E",
        stock_actual: 12,
        coste_ud: 4.5,
        venta_ud: 12.99,
        num_ventas_30d: 9,
        beneficio_ud: 8.49,
        beneficio_total_30d: 76.41,
        valor_stock: 54.0,
        venta_diaria_promedio: 0.3,
        dias_stock_restante: 40,
    },
    {
        proyecto_id: 1,
        nombre_proyecto: "Octopus Control",
        producto_id: 4,
        nombre_producto: "Mando Fire TV Stick",
        stock_actual: 60,
        coste_ud: 1.9,
        venta_ud: 7.49,
        num_ventas_30d: 30,
        beneficio_ud: 5.59,
        beneficio_total_30d: 167.7,
        valor_stock: 114.0,
        venta_diaria_promedio: 1.0,
        dias_stock_restante: 60,
    },
    {
        proyecto_id: 1,
        nombre_proyecto: "Octopus Control",
        producto_id: 5,
        nombre_producto: "Mando Xiaomi Mi Box",
        stock_actual: 5,
        coste_ud: 2.1,
        venta_ud: 6.99,
        num_ventas_30d: 7,
        beneficio_ud: 4.89,
        beneficio_total_30d: 34.23,
        valor_stock: 10.5,
        venta_diaria_promedio: 0.23,
        dias_stock_restante: 22,
    },
];

// ── Daily Finance (last 90 days) ──────────────────────────

/**
 * The day the sample data ends on, as a UTC midnight.
 *
 * The generators below used to start from `new Date()` and then call
 * `toISOString()` on it, which made the series depend on two things it should
 * not: the time of day, and the machine's timezone. The Worker rendering the
 * page is on UTC and the browser hydrating it is on whatever the reader's
 * clock says, so the two could produce different dates for the same row —
 * React would find a mismatch, throw away the server-rendered page and rebuild
 * it in the browser. Anchoring on a UTC day makes both sides agree.
 */
function utcDayStart(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** `YYYY-MM-DD` for a date already anchored to UTC. */
function utcDay(date: Date): string {
    return date.toISOString().slice(0, 10);
}

/** How many days of sample history the demo carries. */
const MOCK_DAYS = 90;

function generateMockFinanzas(endOfSeries: Date): MockFinanceRow[] {
    const data: MockFinanceRow[] = [];

    for (let i = MOCK_DAYS; i >= 0; i--) {
        const date = new Date(endOfSeries);
        date.setUTCDate(date.getUTCDate() - i);
        const dateStr = utcDay(date);

        // Simulate some variance – weekends have less activity
        const dayOfWeek = date.getUTCDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const activityFactor = isWeekend ? 0.3 : 1;

        // Random but deterministic-ish values based on day index
        const seed = (i * 7 + 13) % 100;
        const ingresos =
            Math.round((40 + seed * 1.2) * activityFactor * 100) / 100;
        const gastos = Math.round((15 + (seed % 40) * 0.8) * activityFactor * 100) / 100;
        const balance = Math.round((ingresos - gastos) * 100) / 100;
        const iva_repercutido = Math.round(ingresos * 0.21 * 100) / 100;
        const iva_soportado = Math.round(gastos * 0.21 * 100) / 100;

        data.push({
            dia: dateStr,
            proyecto_id: 1,
            nombre_proyecto: "Octopus Control",
            ingresos,
            gastos,
            balance,
            urp: Math.round(balance * 0.85 * 100) / 100,
            iva_soportado,
            iva_repercutido,
            saldo_iva: Math.round((iva_repercutido - iva_soportado) * 100) / 100,
        });
    }

    return data;
}

/**
 * The sample rows for today, built once per UTC day.
 *
 * A module-level constant was evaluated when the bundle first loaded, which on
 * a Worker that stays warm for days meant the demo quietly showed a series
 * that ended last week. Rebuilding it when the day changes costs one string
 * comparison per call and keeps "the last 90 days" true.
 */
let cached: { day: string; rows: MockFinanceRow[] } | null = null;

export function mockFinanceRows(): MockFinanceRow[] {
    const end = utcDayStart();
    const day = utcDay(end);
    if (cached?.day !== day) cached = { day, rows: generateMockFinanzas(end) };
    return cached.rows;
}

// ── Evolution chart data helper ───────────────────────────
export function getMockEvolution(days: number) {
    const rows = mockFinanceRows();
    const end = utcDayStart();
    const result = [];

    // Counted rather than compared against a moving `now`: the loop used to
    // run one more or one fewer time depending on the millisecond it started.
    for (let i = days; i >= 0; i--) {
        const date = new Date(end);
        date.setUTCDate(date.getUTCDate() - i);
        const dateStr = utcDay(date);
        const match = rows.find((row) => row.dia === dateStr);

        result.push({
            date: dateStr,
            ingresos: match ? match.ingresos : 0,
            urp: match ? match.urp : 0,
        });
    }

    return result;
}
