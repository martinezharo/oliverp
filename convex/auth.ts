import GitHub from "@auth/core/providers/github";
import { convexAuth } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";

const localDevelopmentOrigins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://100.122.18.49:3000",
]);

function canonicalSiteUrl() {
  const siteUrl = process.env.SITE_URL;
  if (!siteUrl) throw new Error("Missing environment variable SITE_URL");
  return siteUrl.replace(/\/$/, "");
}

/**
 * GitHub is deliberately the only provider. Convex Auth keeps the OAuth
 * callback on the Convex deployment, so one GitHub OAuth App can serve the
 * local Next dev server and the production Worker without an OAuth proxy or
 * application-specific secrets in the frontend. SITE_URL is the canonical
 * production origin; local development is explicitly allowlisted below.
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
        if (destination.origin === siteUrl || localDevelopmentOrigins.has(destination.origin)) {
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
