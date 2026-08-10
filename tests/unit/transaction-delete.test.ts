import { describe, expect, it } from "vitest";
import { transactionDeleteUrl } from "../../src/lib/transactions";

describe("transactionDeleteUrl", () => {
  it("includes the project that owns the transaction", () => {
    const url = new URL(transactionDeleteUrl(7, { id: 42, type: "venta" }), "https://erp.test");

    expect(Object.fromEntries(url.searchParams)).toEqual({
      id: "42",
      projectId: "7",
      type: "venta",
    });
  });
});
