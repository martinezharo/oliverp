/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import "@/styles/global.css";

export const metadata: Metadata = {
  title: "OlivERP",
  description: "OlivERP management system",
  icons: { icon: "/favicon.webp" },
};

export const dynamic = "force-dynamic";

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
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen overflow-x-hidden bg-[#0f1016] text-slate-300">
        <ConvexClientProvider convexUrl={convexUrl}>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
