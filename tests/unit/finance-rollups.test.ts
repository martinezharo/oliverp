import { describe, expect, it } from "vitest";

import { getTranslator } from "../../src/i18n/t";
import { groupFinanceRows, summarizeFinances } from "../../src/lib/finance";

import type { FinanceRow } from "../../src/types/erp";

function row(dia: string, values: Partial<FinanceRow> = {}): FinanceRow {
    return {
        dia,
        ingresos: 0,
        gastos: 0,
        balance: 0,
        urp: 0,
        proyecto_id: 1,
        ...values,
    };
}

/**
 * The figures on the dashboard and the history screen are what the user files
 * taxes from, so the arithmetic is pinned against a fixed "today" — otherwise
 * the month and quarter windows move under the test.
 */
describe("finance summary", () => {
    // 20 February: second month of Q1, 28 days in the month.
    const now = new Date(2026, 1, 20);

    it("counts the current month and quarter separately", () => {
        const summary = summarizeFinances([
            row("2026-02-10", { ingresos: 100, gastos: 40, balance: 60, urp: 50 }),
            row("2026-01-15", { ingresos: 200, gastos: 80, balance: 120, urp: 90 }),
        ], now);

        expect(summary.month.ingresos).toBe(100);
        expect(summary.month.urp).toBe(50);
        // January is the same quarter, so it lands in the quarter totals only.
        expect(summary.quarter.ingresos).toBe(300);
        expect(summary.quarter.balance).toBe(180);
    });

    it("ignores days before the quarter started", () => {
        const summary = summarizeFinances([
            row("2025-12-31", { ingresos: 999, balance: 999 }),
            row("2026-02-01", { ingresos: 10, balance: 10 }),
        ], now);

        expect(summary.quarter.ingresos).toBe(10);
        expect(summary.month.ingresos).toBe(10);
    });

    it("carries the VAT figures the quarter card shows", () => {
        const summary = summarizeFinances([
            row("2026-02-05", { iva_soportado: 21, iva_repercutido: 42, saldo_iva: 21 }),
            row("2026-02-06", { iva_soportado: 9, iva_repercutido: 8, saldo_iva: -1 }),
        ], now);

        expect(summary.quarter.iva_soportado).toBe(30);
        expect(summary.quarter.iva_repercutido).toBe(50);
        expect(summary.quarter.saldo_iva).toBe(20);
    });

    it("projects the month from the days recorded so far", () => {
        const summary = summarizeFinances([row("2026-02-10", { ingresos: 100, urp: 40 })], now);

        expect(summary.currentDay).toBe(20);
        expect(summary.daysInMonth).toBe(28);
        // 100 over 20 days extrapolated across 28.
        expect(summary.projection.ingresos).toBeCloseTo(140, 5);
        expect(summary.projection.urp).toBeCloseTo(56, 5);
    });

    it("treats missing figures as zero rather than NaN", () => {
        const summary = summarizeFinances([row("2026-02-11")], now);

        expect(summary.month.saldo_iva).toBe(0);
        expect(summary.projection.ingresos).toBe(0);
    });
});

describe("finance grouping", () => {
    // The rollup takes a translator because its labels are language; the
    // arithmetic under test is the same in either.
    const english = getTranslator("en");

    const rows = [
        row("2026-02-10", { ingresos: 100, balance: 60 }),
        row("2026-02-20", { ingresos: 50, balance: 30 }),
        row("2026-05-01", { ingresos: 10, balance: 5 }),
        row("2025-11-15", { ingresos: 7, balance: 3 }),
    ];

    it("adds up the days of each month, newest month first", () => {
        const groups = groupFinanceRows(rows, "month", english);

        expect(groups.map((group) => group.ingresos)).toEqual([10, 100 + 50, 7]);
        expect(groups[0].label).toContain("2026");
        // Sorting is by a padded key, so December does not fall below February.
        expect(groups.map((group) => group.sortKey)).toEqual(["2026-04", "2026-01", "2025-10"]);
    });

    it("folds months into their quarter", () => {
        const groups = groupFinanceRows(rows, "quarter", english);

        expect(groups.map((group) => group.key)).toEqual(["2026-Q2", "2026-Q1", "2025-Q4"]);
        expect(groups[1].ingresos).toBe(150);
    });

    it("folds quarters into their year", () => {
        const groups = groupFinanceRows(rows, "year", english);

        expect(groups.map((group) => group.key)).toEqual(["2026", "2025"]);
        expect(groups[0].ingresos).toBe(160);
        expect(groups[0].balance).toBe(95);
    });

    it("collapses everything into a single historic total", () => {
        const groups = groupFinanceRows(rows, "total", english);

        expect(groups).toHaveLength(1);
        expect(groups[0].ingresos).toBe(167);
        expect(groups[0].balance).toBe(98);
    });

    it("has no groups without rows", () => {
        expect(groupFinanceRows([], "month", english)).toEqual([]);
    });
});
