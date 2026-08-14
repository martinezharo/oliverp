import LoginClient from "@/components/LoginClient";
import { privatePageMetadata } from "@/i18n/page-metadata";

// The screen no longer renders AppLayout, which used to carry this title.
// `noindex` for the same reason as the application it guards: a sign-in form
// is nobody's search result, and both languages of it even less so.
export const generateMetadata = privatePageMetadata("title.login");

/**
 * The Convex URL is read from the Worker env at request time, so this route
 * must not be prerendered — a build-time render would bake in whatever the
 * build environment happened to have. The `/app` routes are already dynamic
 * because their layout reads the demo cookie, which is why the flag lives here
 * and on the landing page instead of blanketing everything from the root.
 */
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginClient />;
}
