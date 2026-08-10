import type { Metadata } from "next";

import LoginClient from "@/components/LoginClient";
import { ui } from "@/i18n/ui";

// The screen no longer renders AppLayout, which used to carry this title.
export const metadata: Metadata = { title: ui.en["title.login"] };

/**
 * The Convex URL is read from the Worker env at request time, so this route
 * must not be prerendered — a build-time render would bake in whatever the
 * build environment happened to have. The `(erp)` routes are already dynamic
 * because their layout reads the demo cookie, which is why the flag lives
 * here instead of blanketing the whole app from the root layout.
 */
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginClient />;
}
