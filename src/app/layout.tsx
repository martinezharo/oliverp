import type { Metadata } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/outfit";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import "@/styles/global.css";

export const metadata: Metadata = {
  title: "OlivERP",
  description: "OlivERP management system",
  icons: { icon: "/favicon.webp" },
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
          <ConvexClientProvider convexUrl={convexUrl}>{children}</ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
