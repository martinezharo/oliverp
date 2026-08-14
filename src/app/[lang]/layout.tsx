import type { Metadata, Viewport } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/outfit";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { PwaSetup } from "@/components/PwaSetup";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { LOCALES, LOCALE_TAGS } from "@/i18n/locale";
import { resolveLang, type LangParams } from "@/i18n/params";
import { getTranslator } from "@/i18n/t";
import { APPLE_TOUCH_ICON, PWA_THEME_COLOR } from "@/lib/pwa";
import { SITE_ORIGIN } from "@/lib/site";
import "@/styles/global.css";

/**
 * The root layout, and the only place that knows what language the page is in.
 *
 * It sits inside `[lang]` rather than at the top of `app/` because `<html
 * lang>` has to say which language the document is written in, and nothing
 * above this segment knows. The default language is not in the URL — `/app` is
 * English and `/es/app` is Spanish — so a rewrite in `next.config.ts` fills
 * this segment in for the unprefixed addresses.
 */

/** Both languages are known at build time; anything else is not a page. */
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata(props: LangParams): Promise<Metadata> {
  const lang = await resolveLang(props);
  const { t } = getTranslator(lang);

  return {
    // Every relative URL in any page's metadata resolves against this, which
    // is what makes canonicals and Open Graph images absolute.
    metadataBase: new URL(SITE_ORIGIN),
    title: { default: t("pwa.name"), template: "%s" },
    description: t("pwa.description"),
    applicationName: t("pwa.shortName"),
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
    openGraph: {
      siteName: t("pwa.shortName"),
      locale: LOCALE_TAGS[lang],
      type: "website",
    },
    twitter: { card: "summary_large_image" },
  };
}

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

export default async function RootLayout({ children, ...props }: LangParams & { children: React.ReactNode }) {
  const lang = await resolveLang(props);
  const convexUrl = runtimeConvexUrl();
  return (
    // The server provider hands the cookie-borne token to the client, so the
    // first render already knows whether there is a session.
    <ConvexAuthNextjsServerProvider storageNamespace={convexUrl}>
      <html lang={LOCALE_TAGS[lang]} className="dark">
        <body className="min-h-screen overflow-x-hidden bg-[#0f1016] text-slate-300">
          <LocaleProvider lang={lang}>
            <PwaSetup />
            <ConvexClientProvider convexUrl={convexUrl}>{children}</ConvexClientProvider>
          </LocaleProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
