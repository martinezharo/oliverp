import type { NextConfig } from "next";

import { DEFAULT_LOCALE } from "./src/i18n/locale";

/**
 * The app talks to exactly two origins: itself and the Convex deployment
 * (HTTPS for queries, WSS for the reactive subscription). `connect-src` is
 * therefore a wildcard over Convex rather than a fixed host, because the
 * deployment URL differs between local development, preview and production.
 *
 * Fonts are self-hosted and there are no third-party scripts, so everything
 * else can stay on 'self'. `'unsafe-inline'` remains for styles only: Tailwind
 * and Next both emit inline <style> during hydration.
 */
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: https://avatars.githubusercontent.com",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  // React's development build uses eval() for its debugging features, and the
  // dev server needs websockets for hot reload. Neither is granted in a
  // production build.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.convex.site${isDev ? " ws://127.0.0.1:* ws://localhost:*" : ""}`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Development is exposed to the tailnet through Tailscale Serve on 8446.
  // Next otherwise rejects its HMR requests because the public HTTPS hostname
  // differs from the HTTP origin seen by the upstream dev server.
  allowedDevOrigins: ["dev-oli.tail74d55a.ts.net"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  /**
   * English has no prefix of its own: `/app/stock` is English and
   * `/es/app/stock` is Spanish. `/en/app/stock` would be a second address for
   * a page that already has one, so it is sent to the canonical form rather
   * than served — permanently, because that is what it is.
   */
  async redirects() {
    return [
      { source: `/${DEFAULT_LOCALE}`, destination: "/", permanent: true },
      { source: `/${DEFAULT_LOCALE}/:path*`, destination: "/:path*", permanent: true },
      { source: "/documentacion/:slug", destination: "/documentation/:slug", permanent: true },
      { source: "/documentacion", destination: "/documentation", permanent: true },
      { source: "/es/documentacion/:slug", destination: "/es/documentation/:slug", permanent: true },
      { source: "/es/documentacion", destination: "/es/documentation", permanent: true },
      { source: "/app/documentacion/:slug", destination: "/documentation/:slug", permanent: true },
      { source: "/app/documentacion", destination: "/documentation", permanent: true },
      { source: "/es/app/documentacion/:slug", destination: "/es/documentation/:slug", permanent: true },
      { source: "/es/app/documentacion", destination: "/es/documentation", permanent: true },
    ];
  },

  /**
   * …which leaves the unprefixed addresses to be filled in with the default
   * language so they reach `app/[lang]`.
   *
   * `afterFiles` runs once the filesystem has had its turn, so
   * `/manifest.webmanifest`, `/sw.js` and everything in `public/` are served
   * as themselves and never rewritten into a language that has no such page.
   */
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        { source: "/", destination: `/${DEFAULT_LOCALE}` },
        { source: "/login", destination: `/${DEFAULT_LOCALE}/login` },
        { source: "/offline", destination: `/${DEFAULT_LOCALE}/offline` },
        { source: "/documentation", destination: `/${DEFAULT_LOCALE}/documentation` },
        {
          source: "/documentation/:path*",
          destination: `/${DEFAULT_LOCALE}/documentation/:path*`,
        },
        { source: "/app", destination: `/${DEFAULT_LOCALE}/app` },
        {
          // Keep the application remainder as a catch-all: a normal `:path`
          // parameter cannot safely carry the slash in `/app/stock` through
          // OpenNext's router. Listing the unprefixed page families explicitly
          // also keeps `/api`, public assets and `/es` out of this rewrite.
          source: "/app/:path*",
          destination: `/${DEFAULT_LOCALE}/app/:path*`,
        },
      ],
      fallback: [],
    };
  },
};

export default nextConfig;
