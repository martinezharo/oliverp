"use client";

import { useEffect } from "react";

import { watchInstallState } from "@/lib/install-prompt";
import { SERVICE_WORKER_PATH } from "@/lib/pwa";

/**
 * The two things an installable OlivERP needs from the browser, done once at
 * the root: register the service worker, and start watching for the install
 * prompt before anything can miss it.
 *
 * It renders nothing. It sits in the root layout rather than in the `/app`
 * group because the landing page has to be installable too — that is where
 * somebody first meets the product.
 */
export function PwaSetup() {
  useEffect(() => watchInstallState(), []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // In development the build output is regenerated constantly and a worker
    // sitting in front of it serves chunks that no longer match the page. Any
    // worker left over from a production visit to the same origin is removed
    // rather than merely skipped.
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) void registration.unregister();
      });
      return;
    }
    // Registration competes with the page's own requests for bandwidth, so it
    // waits until the page has finished loading.
    const register = () => void navigator.serviceWorker.register(SERVICE_WORKER_PATH).catch(() => undefined);
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
