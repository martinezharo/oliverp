/**
 * The money arithmetic the backend does, repeated for the demo.
 *
 * Demo mode has no backend behind it, so every figure on screen is computed
 * in the browser. These three helpers mirror `convex/lib/bridge.ts` exactly:
 * amounts are held as integer cents and only turned into euros at the edge,
 * which is what keeps a demo total from drifting a cent away from the total
 * the real application would have shown for the same operations.
 */

/** Euros to the integer cents every record stores. */
export const cents = (value: number): number => Math.round(value * 100);

/** Integer cents back to the euros the views render. */
export const euros = (value: number): number => Math.round(value) / 100;

/** The VAT already contained in a gross amount, in cents. */
export function vatPart(grossCents: number, rate: number): number {
  if (!rate) return 0;
  return Math.round(grossCents * (rate / (100 + rate)));
}

/** Rounds a euro amount the way a price list does. */
export const round2 = (value: number): number => Math.round(value * 100) / 100;
