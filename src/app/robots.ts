import type { MetadataRoute } from "next";

import { APP_ROOT } from "@/lib/navigation";
import { SITE_ORIGIN } from "@/lib/site";

/**
 * What a crawler is invited to read.
 *
 * Almost all of OlivERP is somebody's books behind a session, and a crawler
 * that asks for it gets a redirect to the login page — which is a page worth
 * nobody's index either. So the public surface is the landing page in its two
 * languages, and everything else is declined here rather than left to be
 * discovered and then bounced.
 *
 * This is a courtesy, not a control: the middleware is what actually keeps
 * `/app` private.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        `${APP_ROOT}/`,
        APP_ROOT,
        "/login",
        "/offline",
        "/api/",
        // The same three, in Spanish.
        `/es${APP_ROOT}`,
        "/es/login",
        "/es/offline",
      ],
    },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}
