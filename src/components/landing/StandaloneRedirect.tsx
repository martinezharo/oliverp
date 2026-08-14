"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { isRunningStandalone } from "@/lib/install-prompt";
import { APP_ROOT } from "@/lib/navigation";

/**
 * Sends an installed OlivERP straight to the ERP if it ever lands here.
 *
 * The manifest's `start_url` already opens the application rather than this
 * page, so this covers what `start_url` cannot: a home-screen shortcut saved
 * before the manifest said so, and a link back to `/` followed inside the
 * installed window. Someone who has installed the product does not need to be
 * sold it again.
 *
 * Only for the installed application — in a browser tab `/` is the landing
 * page for everybody, signed in or not.
 */
export function StandaloneRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (isRunningStandalone()) router.replace(APP_ROOT);
  }, [router]);

  return null;
}
