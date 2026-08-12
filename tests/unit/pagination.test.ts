import { describe, expect, it } from "vitest";

import { visiblePages } from "../../src/lib/pagination";

/**
 * The pager shows a sliding window of page numbers. Getting the edges wrong is
 * invisible in the middle of a long list and only shows up on the first and
 * last pages, where the window has nowhere left to slide.
 */
describe("visible pages", () => {
    it("shows every page while they fit in the window", () => {
        expect(visiblePages(1, 3)).toEqual([1, 2, 3]);
        expect(visiblePages(3, 5)).toEqual([1, 2, 3, 4, 5]);
    });

    it("keeps the window full at the start instead of sliding off the front", () => {
        expect(visiblePages(1, 20)).toEqual([1, 2, 3, 4, 5]);
        expect(visiblePages(2, 20)).toEqual([1, 2, 3, 4, 5]);
    });

    it("centres the window once there is room on both sides", () => {
        expect(visiblePages(7, 20)).toEqual([5, 6, 7, 8, 9]);
    });

    it("pulls the window back rather than paging past the last page", () => {
        expect(visiblePages(20, 20)).toEqual([16, 17, 18, 19, 20]);
        expect(visiblePages(19, 20)).toEqual([16, 17, 18, 19, 20]);
    });

    it("has nothing to show without pages", () => {
        expect(visiblePages(1, 0)).toEqual([]);
    });
});
