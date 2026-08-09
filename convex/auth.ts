import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { env, query } from "./_generated/server";
import { betterAuth } from "better-auth/minimal";
import authConfig from "./auth.config";

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    database: authComponent.adapter(ctx),
    baseURL: env.SITE_URL ?? "http://localhost:4321",
    basePath: "/api/auth",
    trustedOrigins: async (request) => {
      const origins = new Set<string>([env.SITE_URL ?? "http://localhost:4321"]);
      const forwardedHost = request?.headers.get("x-forwarded-host");
      const forwardedProto = request?.headers.get("x-forwarded-proto") ?? "https";
      if (forwardedHost) origins.add(`${forwardedProto}://${forwardedHost}`);
      const origin = request?.headers.get("origin");
      if (origin) origins.add(origin);
      return [...origins];
    },
    emailAndPassword: {
      enabled: true,
    },
    plugins: [convex({ authConfig })],
  });

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return {
      id: identity.subject,
      tokenIdentifier: identity.tokenIdentifier,
      email: user.email,
      name: user.name,
    };
  },
});
