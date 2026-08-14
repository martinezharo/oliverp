"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Logo } from "@/components/ui/Logo";
import { t } from "@/i18n/t";
import { APP_SECTIONS, activeSectionPath, appPath, type AppSection } from "@/lib/navigation";

type MenuItem = {
  label: string;
  mobileLabel?: string;
  path: string;
  icon: string;
};

function toMenuItem(section: AppSection): MenuItem {
  return {
    label: t(section.navKey),
    ...(section.mobileLabel === undefined ? {} : { mobileLabel: section.mobileLabel }),
    path: appPath(section.segment),
    icon: section.icon,
  };
}

// The bottom bar only has room for a handful of destinations before the labels
// stop being readable, so the navigation is split: the operational routes stay
// on the bar and the rest move behind the "More" button. The sidebar on large
// screens has room for everything and renders both groups inline.
const primaryItems = APP_SECTIONS.filter((section) => section.group === "primary").map(toMenuItem);
const overflowItems = APP_SECTIONS.filter((section) => section.group === "overflow").map(toMenuItem);

const moreIcon = "M6 12h.01M12 12h.01M18 12h.01";
// The toggle swaps to a cross while the panel is open, so a second tap on the
// same cell reads as "close" rather than as another destination.
const closeIcon = "M6 18L18 6M6 6l12 12";

function NavIcon({ path, active, className = "" }: { path: string; active: boolean; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`h-5 w-5 transition-transform group-hover:scale-110 ${active ? "text-primary-400" : "text-slate-500 group-hover:text-white"} ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={path} />
    </svg>
  );
}

/**
 * The bottom bar has no room for the rail indicator the sidebar uses, so the
 * current cell is marked with a short underline above its icon instead.
 */
function ActiveMark() {
  return (
    <span className="absolute inset-x-0 top-0 mx-auto h-0.5 w-8 rounded-full bg-primary-400 shadow-[0_0_10px_rgba(var(--primary-500),0.8)] lg:hidden" />
  );
}

/** A destination on the bottom bar (mobile) or the sidebar rail (desktop). */
function NavLink({
  item,
  active,
  search,
  className = "",
}: {
  item: MenuItem;
  active: boolean;
  search: string;
  className?: string;
}) {
  return (
    <Link
      href={`${item.path}${search}`}
      aria-current={active ? "page" : undefined}
      className={`group relative flex min-w-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-xl px-0.5 py-2 transition-all duration-200 active:scale-95 lg:flex-none lg:flex-row lg:justify-start lg:px-3 lg:py-3 lg:active:scale-100 ${active ? "bg-primary-500/10 text-primary-400" : "text-slate-400 hover:bg-white/5 hover:text-white"} ${className}`}
    >
      {active && (
        <>
          <ActiveMark />
          <div className="absolute left-0 top-1/2 hidden h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary-500 shadow-[0_0_12px_rgba(var(--primary-500),0.8)] lg:block" />
        </>
      )}
      <NavIcon path={item.icon} active={active} className="lg:h-6 lg:w-6" />
      <span className="mt-1 block max-w-full truncate whitespace-nowrap text-[9px] font-medium leading-tight tracking-tight lg:hidden">
        {item.mobileLabel ?? item.label}
      </span>
      <span className="ml-3 hidden font-medium tracking-wide lg:block">{item.label}</span>
    </Link>
  );
}

export default function Sidebar({ currentPath, search }: { currentPath: string; search: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  // Anchored on the whole bar so a tap on the toggle or inside the panel is
  // never treated as a click outside.
  const moreRef = useRef<HTMLElement>(null);
  // Exactly one section is current, so the dashboard — whose path prefixes
  // every other one — no longer lights up alongside the real destination.
  const activePath = activeSectionPath(currentPath);
  const overflowActive = overflowItems.some((item) => item.path === activePath);

  useEffect(() => {
    if (!moreOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen]);

  return (
    <>
    {/* Dimming the app makes it obvious the bar has taken over the screen, and
        gives the panel an unambiguous "tap anywhere to dismiss" target. */}
    {moreOpen && (
      <div
        className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        onClick={() => setMoreOpen(false)}
        aria-hidden="true"
      />
    )}
    <aside ref={moreRef} className="safe-bottom-bar fixed bottom-0 left-0 right-0 z-40 flex flex-row border-t border-white/5 bg-[#0f1016]/95 backdrop-blur-xl transition-all duration-300 lg:bottom-auto lg:right-auto lg:top-0 lg:h-screen lg:w-64 lg:flex-col lg:border-r lg:border-t-0 lg:pb-0">
      <div className="hidden h-16 items-center justify-center border-b border-white/5 px-0 lg:flex lg:justify-start lg:px-6">
        <Link href={appPath()}>
          <Logo nameClassName="hidden lg:block" />
        </Link>
      </div>

      <nav className="flex flex-1 flex-row items-stretch justify-around overflow-x-auto px-0 py-0 lg:flex-col lg:justify-start lg:space-y-2 lg:overflow-y-auto lg:px-3 lg:py-6">
        {primaryItems.map((item) => (
          <NavLink key={item.path} item={item} active={item.path === activePath} search={search} />
        ))}

        {/* Behind "More" on the bottom bar, inline on the sidebar. */}
        {overflowItems.map((item) => (
          <NavLink
            key={item.path}
            item={item}
            active={item.path === activePath}
            search={search}
            className="hidden lg:flex"
          />
        ))}

        <div className="flex min-w-0 flex-1 lg:hidden">
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen}
            aria-label={moreOpen ? t("nav.moreClose") : t("nav.more")}
            className={`group relative flex min-w-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-xl px-0.5 py-2 transition-all duration-200 active:scale-95 ${moreOpen || overflowActive ? "bg-primary-500/10 text-primary-400" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            {overflowActive && <ActiveMark />}
            <NavIcon path={moreOpen ? closeIcon : moreIcon} active={moreOpen || overflowActive} />
            <span className="mt-1 block max-w-full truncate whitespace-nowrap text-[9px] font-medium leading-tight tracking-tight">
              {t("nav.more")}
            </span>
          </button>
        </div>
      </nav>

      {/* Outside the nav on purpose: that element scrolls horizontally on
          mobile, and a panel rendered inside it would be clipped away. */}
      {moreOpen && (
        // A full-width strip aligned with flexbox: the panel lands over the
        // "More" cell without depending on how `right` resolves inside the bar.
        <div className="pointer-events-none absolute inset-x-0 bottom-full flex justify-end px-2 pb-2 lg:hidden">
          <div className="pointer-events-auto w-48 origin-bottom-right animate-[zoom-in_0.15s_ease-out] overflow-hidden rounded-2xl border border-white/10 bg-[#161821] p-2 shadow-2xl shadow-black/50">
            {overflowItems.map((item) => {
              const active = item.path === activePath;
              return (
                <Link
                  key={item.path}
                  href={`${item.path}${search}`}
                  aria-current={active ? "page" : undefined}
                  // The shell survives route changes, so the sheet has to be
                  // dismissed explicitly when a destination is picked.
                  onClick={() => setMoreOpen(false)}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors active:bg-white/10 ${active ? "bg-primary-500/10 text-primary-400" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}
                >
                  <NavIcon path={item.icon} active={active} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" />}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </aside>
    </>
  );
}
