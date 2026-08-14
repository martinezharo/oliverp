"use client";

import { useEffect, useState } from "react";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useT } from "@/i18n/LocaleProvider";

import { landingContent } from "./content";
import { EnterButton, Wordmark } from "./ui";

/**
 * The landing header.
 *
 * It sits over the hero with no surface of its own and only materialises —
 * background, blur and hairline — once the page has been scrolled, so the
 * first screen is the product rather than a bar. Fixed rather than sticky so
 * the hero passes underneath it; pages compensate with their own top padding.
 */
export function LandingNav() {
  const translator = useT();
  // The nav is a client component for the scroll listener alone, so it builds
  // its own copy rather than being handed it through a prop it would then have
  // to serialize across the boundary on every render.
  const { navLinks, cta } = landingContent(translator);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b transition-colors duration-300 ${
        scrolled ? "border-white/5 bg-[#0f1016]/80 backdrop-blur-md" : "border-transparent bg-transparent"
      }`}
    >
      {/* Tight gutters on a phone: the wordmark and the call to action have to
          share 320px without wrapping, so the label drops to just the verb
          until there is room for the rest of it. */}
      <div className="safe-header mx-auto flex w-full max-w-6xl items-center gap-3 px-4 sm:gap-8 sm:px-6">
        <Wordmark href={cta.homeHref} className="shrink-0" />
        <nav className="hidden gap-7 text-sm text-slate-400 md:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-white">
              {link.label}
            </a>
          ))}
        </nav>
        {/* Hidden on the narrowest screens, where the wordmark and the call to
            action already share 320px. The one in settings is always there. */}
        <LanguageSwitcher className="ml-auto hidden shrink-0 sm:inline-flex" />
        <EnterButton cta={cta} short className="ml-auto shrink-0 sm:ml-3" />
      </div>
    </header>
  );
}
