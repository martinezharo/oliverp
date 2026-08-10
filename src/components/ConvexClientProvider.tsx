"use client";

import { api } from "@convex/_generated/api";
import { useAuthActions, useAuthToken } from "@convex-dev/auth/react";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { useConvexAuth, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo } from "react";
import { CloudSessionContext, type CloudSession } from "@/hooks/useCloudSession";
import { setAuthToken } from "@/lib/authToken";
import { getConvexBrowserClient } from "@/lib/convex-browser";

function CloudSessionBridge({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const token = useAuthToken();
  const viewer = useQuery(api.auth.currentUser, isAuthenticated ? {} : "skip");

  useEffect(() => {
    setAuthToken(token ?? null);
  }, [token]);

  const handleSignIn = useCallback(async () => {
    await signIn("github", { redirectTo: window.location.href });
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
