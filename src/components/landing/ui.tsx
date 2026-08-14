import Link from "next/link";

import { Logo } from "@/components/ui/Logo";

import { DEMO_HREF, type FooterLinkSpec, type LandingContent } from "./content";
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

/**
 * The shape every call to action shares.
 *
 * Note that `display` deliberately lives here and nowhere else: a caller that
 * also passed a display utility through `className` would be fighting this one
 * at equal specificity, and which of the two won would come down to the order
 * Tailwind happened to emit them in. Callers that need a button to disappear at
 * a breakpoint wrap it instead — see `LandingNav`.
 */
/**
 * The transparent border is not decoration: the outlined variants only override
 * its colour, so a filled and an outlined button end up exactly the same height
 * and line up when they sit next to — or stacked on top of — each other.
 */
const BUTTON = "inline-flex items-center justify-center gap-2 rounded-xl border border-transparent transition-all duration-200";

/**
 * `lg` is the in-page size and `md` the one the header uses. Both keep at least
 * 44px of height so they stay comfortable to tap.
 */
const SIZES = {
  md: "min-h-11 px-4 py-2.5 text-sm",
  lg: "min-h-13 px-5 py-3.5 text-base sm:px-6",
} as const;

/** Stacks a row of calls to action full width until there is room beside them. */
export const CTA_ROW = "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center";

/** Pairs with `CTA_ROW`: full width while stacked, intrinsic once side by side. */
export const CTA_ITEM = "w-full sm:w-auto";

export function ArrowRight({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

/**
 * The application logo, linking home — the home of the language being read,
 * so the Spanish footer does not quietly send you back to the English page.
 */
export function Wordmark({ href, className = "" }: { href: string; className?: string }) {
  return (
    <Link href={href} className={className}>
      <Logo />
    </Link>
  );
}

/**
 * `ghost` is for the places where entering is the second choice — next to the
 * demo, which closes the page — so two filled buttons never compete.
 */
export function EnterButton({
  cta,
  size = "md",
  variant = "solid",
  short = false,
  className = "",
}: {
  /** The labels and the destination, both of which are the page's language. */
  cta: LandingContent["cta"];
  size?: "md" | "lg";
  variant?: "solid" | "ghost";
  /** Drops the "the ERP" tail until there is width for it. For the header on phones. */
  short?: boolean;
  className?: string;
}) {
  const surface =
    variant === "solid"
      ? "bg-linear-to-r from-primary-500 to-indigo-600 font-bold text-white shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40"
      : "border border-white/10 bg-white/5 font-semibold text-white hover:bg-white/10";
  return (
    <Link
      href={cta.enterHref}
      className={`${BUTTON} whitespace-nowrap hover:scale-[1.02] ${surface} ${SIZES[size]} ${className}`}
    >
      {/* One flex item, so the `gap-2` above separates the label from the arrow
          and not the verb from the rest of its own sentence. */}
      <span>
        {cta.enter}
        {short ? (
          <span className="hidden sm:inline">&nbsp;{cta.enterSuffix}</span>
        ) : (
          <>&nbsp;{cta.enterSuffix}</>
        )}
      </span>
      <ArrowRight className="h-4 w-4 shrink-0" />
    </Link>
  );
}

function EyeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

export function DemoButton({ label, size = "md", className = "" }: { label: string; size?: "md" | "lg"; className?: string }) {
  return (
    // The demo endpoint sets a cookie on the Worker and redirects, so it has to
    // be a native navigation rather than a client-side route change.
    <a
      href={DEMO_HREF}
      className={`${BUTTON} whitespace-nowrap border-amber-400/20 bg-amber-400/5 font-semibold text-amber-100 hover:border-amber-300/40 hover:bg-amber-400/10 ${SIZES[size]} ${className}`}
    >
      <EyeIcon className="h-4 w-4 shrink-0 text-amber-300" />
      {label}
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
      className={`${BUTTON} whitespace-nowrap bg-linear-to-r from-amber-400 to-amber-500 font-bold text-amber-950 shadow-lg shadow-amber-500/20 hover:scale-[1.02] hover:shadow-amber-500/40 ${SIZES.lg} ${className}`}
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

/**
 * A footer link, padded to stay a comfortable tap target. The negative inset
 * keeps that padding from pushing the label out of alignment with the column
 * heading above it.
 */
function FooterLink({ href, label, native = false, newTab = false }: FooterLinkSpec) {
  const className = "-mx-2 inline-flex w-fit items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:text-white";
  return native ? (
    <a href={href} className={className} {...(newTab && { target: "_blank", rel: "noreferrer" })}>{label}</a>
  ) : (
    <Link href={href} className={className}>{label}</Link>
  );
}

export function LandingFooter({ footer, homeHref }: { footer: LandingContent["footer"]; homeHref: string }) {
  return (
    <footer className="border-t border-white/5 bg-white/[0.015]">
      <div className="mx-auto w-full max-w-6xl px-5 py-12 text-sm text-slate-400 sm:px-6 sm:py-14">
        {/* The brand block sits above the columns on a phone and beside them
            from `md`, where there is width for the tagline to hold its own. */}
        <div className="flex flex-col gap-10 md:flex-row md:justify-between md:gap-16">
          <div className="max-w-xs">
            <Wordmark href={homeHref} className="inline-block" />
            <p className="mt-4 text-sm leading-relaxed text-slate-500">{footer.tagline}</p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:gap-16 md:shrink-0">
            {footer.groups.map((group) => (
              <div key={group.title}>
                <Label className="mb-3">{group.title}</Label>
                <ul className="flex flex-col gap-0.5">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <FooterLink {...link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-10 border-t border-white/5 pt-6 font-mono text-xs text-slate-600 sm:mt-12">{footer.legal}</p>
      </div>
    </footer>
  );
}
