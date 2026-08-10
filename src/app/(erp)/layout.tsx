import { cookies } from "next/headers";

import ErpShell from "@/components/ErpShell";
import { DEMO_MODE_COOKIE } from "@/lib/runtime";

/**
 * The shell lives here rather than in each page so Next keeps it mounted
 * while navigating between the routes of this group.
 *
 * Demo mode is resolved here too: the cookie is httpOnly, so the browser used
 * to discover it through `/api/demo/status` and could not even start loading
 * projects until that round-trip came back. Reading it server-side removes
 * that leg of the waterfall entirely.
 */
export default async function ErpLayout({ children }: { children: React.ReactNode }) {
  const demo = (await cookies()).get(DEMO_MODE_COOKIE)?.value === "1";
  return <ErpShell demo={demo}>{children}</ErpShell>;
}
