import { defineApp } from "convex/server";
import { v } from "convex/values";
import betterAuth from "@convex-dev/better-auth/convex.config";

const app = defineApp({
  env: {
    CONVEX_BRIDGE_SECRET: v.string(),
    CONVEX_SITE_URL: v.optional(v.string()),
    SITE_URL: v.optional(v.string()),
  },
});

app.use(betterAuth);

export default app;
