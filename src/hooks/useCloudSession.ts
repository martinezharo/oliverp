"use client";

import { createContext, useContext } from "react";

interface CloudUser {
  id: string;
  name: string | null;
  email: string | null;
  imageUrl?: string | null;
}

export interface CloudSession {
  user: CloudUser | null;
  ready: boolean;
  /**
   * Whether the token has been resolved, which happens well before the user
   * profile arrives. Gating the app shell on this — instead of on `user` —
   * keeps a signed-out visitor from ever seeing the application render.
   */
  authKnown: boolean;
  /** A valid token exists; the profile behind it may still be loading. */
  authenticated: boolean;
  configured: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const defaultSession: CloudSession = {
  user: null,
  ready: true,
  authKnown: true,
  authenticated: false,
  configured: false,
  signIn: async () => undefined,
  signOut: async () => undefined,
};

export const CloudSessionContext = createContext<CloudSession>(defaultSession);

export function useCloudSession(): CloudSession {
  return useContext(CloudSessionContext);
}
