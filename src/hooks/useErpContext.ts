"use client";

import { createContext, useContext } from "react";
import type { PluginEffect } from "@/lib/plugins";

export type Project = { id: number; nombre: string; activo?: boolean };
export type ModalKind = "sale" | "purchase" | "other" | "product" | null;
export type ModalRequest = { kind: Exclude<ModalKind, null>; id?: number };

export interface ErpContextValue {
  /** The project every view reads, or null while none is selected. */
  projectId: number | null;
  projects: Project[];
  demo: boolean;
  /** False only while the very first project list is in flight. */
  ready: boolean;
  /** Declarative effects from active plugins installed for this project. */
  pluginEffects: PluginEffect[];
  openModal: (kind: Exclude<ModalKind, null>, id?: number) => void;
}

const defaultContext: ErpContextValue = {
  projectId: null,
  projects: [],
  demo: false,
  ready: false,
  pluginEffects: [],
  openModal: () => undefined,
};

export const ErpContext = createContext<ErpContextValue>(defaultContext);

/**
 * The shell owns the project selection and the modal stack, and it now lives
 * in a layout that survives navigation. Views read it from context instead of
 * receiving props from a page component that gets remounted on every route
 * change.
 */
export function useErpContext(): ErpContextValue {
  return useContext(ErpContext);
}
