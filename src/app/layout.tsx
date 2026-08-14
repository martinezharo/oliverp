import type { Metadata, Viewport } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/outfit";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { PwaSetup } from "@/components/PwaSetup";
import { t } from "@/i18n/t";
import { APPLE_TOUCH_ICON, PWA_THEME_COLOR } from "@/lib/pwa";
import "@/styles/global.css";

export const metadata: Metadata = {
  title: "OlivERP",
  description: t("pwa.description"),
  icons: {
    icon: "/favicon.webp",
    // iOS never reads the manifest's icons; this is the only one it takes.
    apple: APPLE_TOUCH_ICON,
  },
  appleWebApp: {
    capable: true,
    title: t("pwa.shortName"),
    // The shell is dark, so the status bar text has to be light. `default`
    // would paint it black on black.
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: PWA_THEME_COLOR,
  // An installed application runs edge to edge on a phone with a notch, and
  // `AppLayout` pays that back with safe-area padding.
  viewportFit: "cover",
};

function runtimeConvexUrl(): string | undefined {
  try {
    const env = getCloudflareContext().env as unknown as Record<string, unknown>;
    return typeof env.NEXT_PUBLIC_CONVEX_URL === "string" ? env.NEXT_PUBLIC_CONVEX_URL : undefined;
  } catch {
    return process.env.NEXT_PUBLIC_CONVEX_URL || undefined;
  }
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const convexUrl = runtimeConvexUrl();
  return (
    // The server provider hands the cookie-borne token to the client, so the
    // first render already knows whether there is a session.
    <ConvexAuthNextjsServerProvider storageNamespace={convexUrl}>
      <html lang="en" className="dark">
        <body className="min-h-screen overflow-x-hidden bg-[#0f1016] text-slate-300">
          <PwaSetup />
          <ConvexClientProvider convexUrl={convexUrl}>{children}</ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
