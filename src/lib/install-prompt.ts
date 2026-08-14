/**
 * Browser-side state for "can this visitor install OlivERP, and have they?".
 *
 * It is a module-level store rather than a hook's own state because the two
 * facts it tracks arrive at times a component cannot choose. `beforeinstallprompt`
 * fires once, shortly after the page loads, and a listener attached later never
 * sees it — so the root of the application starts listening on mount and the
 * event is kept here until settings asks for it, which may be several
 * navigations later.
 *
 * Reading it goes through `useInstallPrompt`.
 */

/** Not in lib.dom yet; only the two members used here are declared. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallState = {
  /** The browser offered a prompt and it has not been used yet. */
  canPrompt: boolean;
  /** The page is running as an installed application. */
  installed: boolean;
};

let deferred: BeforeInstallPromptEvent | null = null;
let snapshot: InstallState = { canPrompt: false, installed: false };
const listeners = new Set<() => void>();

/** The same object until something actually changes, as the hook requires. */
function publish(next: InstallState) {
  if (next.canPrompt === snapshot.canPrompt && next.installed === snapshot.installed) return;
  snapshot = next;
  for (const listener of listeners) listener();
}

/**
 * True when the document is the installed application rather than a tab.
 * Safari answers only to `navigator.standalone`; everything else to the media
 * query, including desktop windows, where `standalone` is never set.
 */
export function isRunningStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}

/** Attached once, from the root of the application. Returns its own teardown. */
export function watchInstallState(): () => void {
  const onBeforeInstallPrompt = (event: Event) => {
    // Suppressed so the browser's own mini-infobar does not compete with the
    // control in settings; the event is replayed from there instead.
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    publish({ canPrompt: true, installed: snapshot.installed });
  };
  const onInstalled = () => {
    deferred = null;
    publish({ canPrompt: false, installed: true });
  };

  window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  window.addEventListener("appinstalled", onInstalled);
  publish({ canPrompt: deferred !== null, installed: isRunningStandalone() });

  return () => {
    window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

export function subscribeToInstallState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getInstallState(): InstallState {
  return snapshot;
}

/** The server renders the state nothing is known about yet: neither, not both. */
export const INSTALL_STATE_UNKNOWN: InstallState = { canPrompt: false, installed: false };

/**
 * Shows the browser's install dialog. Resolves to whether it was accepted.
 *
 * The event can only be used once, so it is dropped either way: a dismissed
 * prompt is re-offered by the browser through a fresh `beforeinstallprompt`,
 * not by replaying this one.
 */
export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  deferred = null;
  publish({ canPrompt: false, installed: snapshot.installed });
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome === "accepted";
  } catch {
    return false;
  }
}
