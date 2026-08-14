"use client";

import { useSyncExternalStore } from "react";

import {
  INSTALL_STATE_UNKNOWN,
  getInstallState,
  subscribeToInstallState,
  type InstallState,
} from "@/lib/install-prompt";

/**
 * Whether OlivERP can be installed from here, and whether it already is.
 *
 * The server has no way to know either, so it renders the same "neither" state
 * the client starts from; the real answer arrives on the first event.
 */
export function useInstallPrompt(): InstallState {
  return useSyncExternalStore(subscribeToInstallState, getInstallState, () => INSTALL_STATE_UNKNOWN);
}
