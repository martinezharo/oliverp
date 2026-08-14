import { afterEach, describe, expect, it, vi } from "vitest";

import { getMockEvolution, mockFinanceRows } from "../../src/lib/mock-data";

/**
 * The demo data is rendered twice — once by the Worker and once by the browser
 * hydrating what it sent — and the two have to agree exactly. They used to
 * disagree, because the series was derived from `new Date()` including its
 * time of day, and then formatted with `toISOString()`, which is UTC. A Worker
 * on UTC and a reader in Madrid could land on different dates for the same
 * row; React would find the mismatch and rebuild the whole page in the
 * browser. So what is tested here is sameness, not the numbers themselves.
 */

afterEach(() => {
    vi.useRealTimers();
});

describe("demo finance data", () => {
    it("is the same at any hour of the day", () => {
        vi.useFakeTimers();

        vi.setSystemTime(new Date("2026-03-15T00:00:01.000Z"));
        const justAfterMidnight = getMockEvolution(30);

        vi.setSystemTime(new Date("2026-03-15T23:59:59.000Z"));
        const justBeforeMidnight = getMockEvolution(30);

        expect(justBeforeMidnight).toEqual(justAfterMidnight);
    });

    it("is the same either side of a timezone that is a day ahead", () => {
        vi.useFakeTimers();

        // 22:30 UTC is already tomorrow in Madrid (UTC+1 or +2). The dates in
        // the series must not move with the reader's clock.
        vi.setSystemTime(new Date("2026-03-15T22:30:00.000Z"));
        const evening = getMockEvolution(30);

        vi.setSystemTime(new Date("2026-03-15T09:00:00.000Z"));
        const morning = getMockEvolution(30);

        expect(evening).toEqual(morning);
    });

    it("asks for one point per day, and always the same number of them", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-03-15T12:00:00.000Z"));

        // The loop used to run against a moving `now`, so it could produce
        // either `days` or `days + 1` points.
        expect(getMockEvolution(30)).toHaveLength(31);
        expect(getMockEvolution(7)).toHaveLength(8);

        const days = getMockEvolution(30).map((point) => point.date);
        expect(new Set(days).size).toBe(days.length);
        expect(days.at(-1)).toBe("2026-03-15");
        expect(days[0]).toBe("2026-02-13");
    });

    it("rebuilds the rows when the day changes under a long-lived Worker", () => {
        vi.useFakeTimers();

        vi.setSystemTime(new Date("2026-03-15T12:00:00.000Z"));
        expect(mockFinanceRows().at(-1)?.dia).toBe("2026-03-15");

        vi.setSystemTime(new Date("2026-03-16T12:00:00.000Z"));
        expect(mockFinanceRows().at(-1)?.dia).toBe("2026-03-16");
    });

    it("hands back the identical rows within one day", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-03-15T12:00:00.000Z"));

        // Same array, not merely an equal one: the shell renders from this on
        // every navigation and rebuilding it would defeat the memoisation.
        expect(mockFinanceRows()).toBe(mockFinanceRows());
    });
});
