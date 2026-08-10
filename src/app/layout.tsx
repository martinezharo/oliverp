import type { Metadata } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import "@/styles/global.css";

export const metadata: Metadata = {
  title: "OlivERP",
  description: "OlivERP management system",
  icons: { icon: "/favicon.webp" },
};

// Self-hosted at build time: the previous <link> to fonts.googleapis.com
// blocked the first render on two extra connections to a third party.
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-outfit",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

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
    <html lang="en" className={`dark ${outfit.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen overflow-x-hidden bg-[#0f1016] text-slate-300">
        <ConvexClientProvider convexUrl={convexUrl}>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
