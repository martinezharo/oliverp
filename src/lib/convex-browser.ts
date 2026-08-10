"use client";

import { ConvexReactClient } from "convex/react";

let client: ConvexReactClient | null | undefined;
let clientUrl: string | undefined;

export function getConvexBrowserClient(url = process.env.NEXT_PUBLIC_CONVEX_URL): ConvexReactClient | null {
  if (client !== undefined && clientUrl === url) return client;

  clientUrl = url;
  client = url ? new ConvexReactClient(url) : null;
  return client;
}
