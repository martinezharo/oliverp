"use client";

import { useSyncExternalStore } from "react";

import { demoDataset, subscribeDemo } from "@/lib/demo/store";
import type { DemoDataset } from "@/lib/demo/types";

/**
 * The demo's records, as a reactive value.
 *
 * It stands in for the Convex subscriptions the signed-in application uses:
 * the store hands back the same object until something is saved, so the
 * derivations the views memoise on it are only recomputed when the data
 * really changed — and when it does, every screen reading it repaints at
 * once, exactly as a pushed Convex update would.
 *
 * The server snapshot is the same untouched dataset, so the page the Worker
 * renders and the page the browser hydrates agree.
 */
export function useDemoDataset(): DemoDataset {
  return useSyncExternalStore(subscribeDemo, demoDataset, demoDataset);
}
