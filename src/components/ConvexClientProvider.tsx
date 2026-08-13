"use client";

import { api } from "@convex/_generated/api";
import { useAuthActions, useAuthToken } from "@convex-dev/auth/react";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { useConvexAuth, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo } from "react";
import { CloudSessionContext, type CloudSession } from "@/hooks/useCloudSession";
import { setAuthToken } from "@/lib/authToken";
import { getConvexBrowserClient } from "@/lib/convex-browser";
import { APP_ROOT } from "@/lib/navigation";

function CloudSessionBridge({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const token = useAuthToken();
  const viewer = useQuery(api.auth.currentUser, isAuthenticated ? {} : "skip");

  useEffect(() => {
    setAuthToken(token ?? null);
  }, [token]);

  // The OAuth round trip comes back to whatever is asked for here, so it has to
  // be a place worth landing on: `window.location.href` would send the user
  // back to `/login` (or, from the landing page, to the landing page itself),
  // leaving a signed-in visitor outside the application. Resolved against the
  // current origin so development hosts return to themselves.
  const handleSignIn = useCallback(async (redirectTo: string = APP_ROOT) => {
    await signIn("github", { redirectTo: new URL(redirectTo, window.location.origin).toString() });
  }, [signIn]);

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const session = useMemo<CloudSession>(
    () => ({
      user: viewer ?? null,
      ready: !isLoading && (!isAuthenticated || viewer !== undefined),
      authKnown: !isLoading,
      authenticated: isAuthenticated,
      configured: true,
      signIn: handleSignIn,
      signOut: handleSignOut,
    }),
    [handleSignIn, handleSignOut, isAuthenticated, isLoading, viewer],
  );

  return <CloudSessionContext.Provider value={session}>{children}</CloudSessionContext.Provider>;
}

export function ConvexClientProvider({ children, convexUrl }: { children: React.ReactNode; convexUrl?: string }) {
  const client = getConvexBrowserClient(convexUrl);
  if (!client) return children;

  // The Next.js flavour of the provider takes its initial token from the
  // cookies read in the root layout and proxies sign-in/out through
  // `/api/auth`, which is what keeps the server and the browser in agreement
  // about the session.
  return (
    <ConvexAuthNextjsProvider client={client}>
      <CloudSessionBridge>{children}</CloudSessionBridge>
    </ConvexAuthNextjsProvider>
  );
}
