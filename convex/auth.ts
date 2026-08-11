import GitHub from "@auth/core/providers/github";
import { convexAuth } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";

/**
 * Post-login destinations allowed in addition to SITE_URL.
 *
 * These are development hosts, and a production deployment must not accept
 * them: the redirect carries the OAuth authorization code, so any origin on
 * this list is an origin that can be handed a working session. They are
 * therefore opt-in per deployment — set ALLOW_LOCAL_AUTH_ORIGINS=true on the
 * dev deployment only, never on production.
 */
function localDevelopmentOrigins(): Set<string> {
  if (process.env.ALLOW_LOCAL_AUTH_ORIGINS !== "true") return new Set();
  const extra = (process.env.LOCAL_AUTH_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return new Set(["http://localhost:3000", "http://127.0.0.1:3000", ...extra]);
}

function canonicalSiteUrl() {
  const siteUrl = process.env.SITE_URL;
  if (!siteUrl) throw new Error("Missing environment variable SITE_URL");
  return siteUrl.replace(/\/$/, "");
}

/**
 * GitHub is deliberately the only provider. Convex Auth keeps the OAuth
 * callback and credentials on the current Convex deployment. Development and
 * production therefore use separate GitHub OAuth Apps and databases without
 * exposing either client secret to Next.js. SITE_URL is the deployment's
 * canonical frontend origin; local development is explicitly allowlisted.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [GitHub],
  callbacks: {
    async redirect({ redirectTo }) {
      const siteUrl = canonicalSiteUrl();

      if (redirectTo.startsWith("?") || redirectTo.startsWith("/")) {
        return `${siteUrl}${redirectTo}`;
      }

      try {
        const destination = new URL(redirectTo);
        if (destination.origin === siteUrl || localDevelopmentOrigins().has(destination.origin)) {
          return redirectTo;
        }
      } catch {
        // Fall through to the canonical site instead of accepting an invalid URL.
      }

      return `${siteUrl}/`;
    },
  },
});

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const userId = identity.subject.split("|")[0] as Id<"users">;
    const user = await ctx.db.get(userId);
    if (!user) return null;

    return {
      id: userId,
      tokenIdentifier: identity.tokenIdentifier,
      email: user.email ?? null,
      name: user.name ?? null,
      imageUrl: user.image ?? null,
    };
  },
});
