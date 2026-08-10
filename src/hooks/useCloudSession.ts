"use client";

import { createContext, useContext } from "react";

export interface CloudUser {
  id: string;
  name: string | null;
  email: string | null;
  imageUrl?: string | null;
}

export interface CloudSession {
  user: CloudUser | null;
  ready: boolean;
  configured: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const defaultSession: CloudSession = {
  user: null,
  ready: true,
  configured: false,
  signIn: async () => undefined,
  signOut: async () => undefined,
};

export const CloudSessionContext = createContext<CloudSession>(defaultSession);

export function useCloudSession(): CloudSession {
  return useContext(CloudSessionContext);
}
