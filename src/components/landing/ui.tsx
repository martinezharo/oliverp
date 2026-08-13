import Link from "next/link";

import { Logo } from "@/components/ui/Logo";
import { APP_ROOT, appPath } from "@/lib/navigation";

import { DEMO_HREF, GITHUB_HREF, GITHUB_REPO } from "./content";
import { TONES, type Tone } from "./tones";

/**
 * The shared surface vocabulary of the landing page.
 *
 * Every class combination here is one the application already uses — the
 * `#0f1016` canvas, the `#14151a` card on a `white/5` hairline, the blue to
 * indigo gradient button, the amber demo affordance — so the landing and the
 * app read as one product no matter which layout is chosen.
 */

export const CARD = "rounded-3xl border border-white/5 bg-[#14151a]";

export function ArrowRight({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

/** The application logo, linking home. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={className}>
      <Logo />
    </Link>
  );
}

/**
 * `ghost` is for the places where entering is the second choice — next to the
 * demo, which closes the page — so two filled buttons never compete.
 */
export function EnterButton({
  size = "md",
  variant = "solid",
  className = "",
}: {
  size?: "md" | "lg";
  variant?: "solid" | "ghost";
  className?: string;
}) {
  const padding = size === "lg" ? "px-6 py-3.5 text-base" : "px-4 py-2.5 text-sm";
  const surface =
    variant === "solid"
      ? "bg-linear-to-r from-primary-500 to-indigo-600 font-bold text-white shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40"
      : "border border-white/10 bg-white/5 font-semibold text-white hover:bg-white/10";
  return (
    <Link
      href={APP_ROOT}
      className={`inline-flex items-center justify-center gap-2 rounded-xl transition-all duration-200 hover:scale-[1.02] ${surface} ${padding} ${className}`}
    >
      Entrar al ERP
      <ArrowRight />
    </Link>
  );
}

export function DemoButton({ size = "md", className = "" }: { size?: "md" | "lg"; className?: string }) {
  const padding = size === "lg" ? "px-6 py-3.5 text-base" : "px-4 py-2.5 text-sm";
  return (
    // The demo endpoint sets a cookie on the Worker and redirects, so it has to
    // be a native navigation rather than a client-side route change.
    <a
      href={DEMO_HREF}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 font-semibold text-amber-100 transition-all hover:border-amber-300/40 hover:bg-amber-400/10 ${padding} ${className}`}
    >
      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
      Probar la demo
    </a>
  );
}

export function GitHubMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .7a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.2.8-.5v-2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.7-1.3-1.7-1.1-.8.1-.8.1-.8 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0C15.9 5 17 5.3 17 5.3c.6 1.6.2 2.9.1 3.2.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.5 5.7.5.4.9 1.1.9 2.2v3.1c0 .3.2.6.8.5A11.5 11.5 0 0 0 12 .7Z" />
    </svg>
  );
}

/** The filled amber call to action that closes every demo section. */
export function DemoCta({ label, className = "" }: { label: string; className?: string }) {
  return (
    // Native navigation, like `DemoButton`: the cookie is set on the redirect.
    <a
      href={DEMO_HREF}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-amber-400 to-amber-500 px-6 py-3.5 font-bold text-amber-950 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] hover:shadow-amber-500/40 ${className}`}
    >
      {label}
      <ArrowRight />
    </a>
  );
}

/** The uppercase micro-label the app uses above panels and in its header. */
export function Label({ tone, children, className = "" }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <p className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 ${className}`}>
      {tone && <span className={`h-2 w-2 rounded-full ${TONES[tone].dot}`} />}
      {children}
    </p>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-10 text-sm text-slate-500">
        <Wordmark />
        <div className="flex flex-wrap items-center gap-6">
          <Link href={APP_ROOT} className="transition-colors hover:text-white">Entrar</Link>
          <a href={DEMO_HREF} className="transition-colors hover:text-white">Demo</a>
          <Link href={appPath("documentacion")} className="transition-colors hover:text-white">Documentación</Link>
          <a href={GITHUB_HREF} target="_blank" rel="noreferrer" className="flex items-center gap-2 transition-colors hover:text-white">
            <GitHubMark className="h-4 w-4" />
            {GITHUB_REPO}
          </a>
        </div>
        <span className="font-mono text-xs text-slate-600">MIT · © 2026 OlivERP</span>
      </div>
    </footer>
  );
}
