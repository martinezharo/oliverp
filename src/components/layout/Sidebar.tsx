"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { t } from "@/i18n/t";

type MenuItem = {
  label: string;
  mobileLabel?: string;
  path: string;
  icon: string;
};

// The bottom bar only has room for a handful of destinations before the labels
// stop being readable, so the navigation is split: the operational routes stay
// on the bar and the rest move behind the "More" button. The sidebar on large
// screens has room for everything and renders both groups inline.
const primaryItems: MenuItem[] = [
  {
    label: t("nav.home"),
    path: "/",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    label: t("nav.stock"),
    path: "/stock",
    icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  },
  {
    label: t("nav.transactions"),
    path: "/transacciones",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    label: t("nav.history"),
    path: "/historial",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
];

const overflowItems: MenuItem[] = [
  {
    label: t("nav.plugins"),
    path: "/plugins",
    icon: "M8.5 3v4.5H4M15.5 3v4.5H20M8.5 21v-4.5H4M15.5 21v-4.5H20 M9.5 7.5h5a2 2 0 012 2v5a2 2 0 01-2 2h-5a2 2 0 01-2-2v-5a2 2 0 012-2z",
  },
  {
    label: t("nav.settings"),
    path: "/ajustes",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    label: t("nav.documentation"),
    mobileLabel: "Docs",
    path: "/documentacion",
    icon: "M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z M8 7h8M8 11h6",
  },
];

const moreIcon = "M6 12h.01M12 12h.01M18 12h.01";
// The toggle swaps to a cross while the panel is open, so a second tap on the
// same cell reads as "close" rather than as another destination.
const closeIcon = "M6 18L18 6M6 6l12 12";

const isCurrent = (currentPath: string, path: string) =>
  currentPath === path || currentPath.startsWith(`${path}/`);

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
  const overflowActive = overflowItems.some((item) => isCurrent(currentPath, item.path));

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
    <aside ref={moreRef} className="fixed bottom-0 left-0 right-0 z-40 flex h-16 flex-row border-t border-white/5 bg-[#0f1016]/95 backdrop-blur-xl transition-all duration-300 lg:bottom-auto lg:right-auto lg:top-0 lg:h-screen lg:w-64 lg:flex-col lg:border-r lg:border-t-0">
      <div className="hidden h-16 items-center justify-center border-b border-white/5 px-0 lg:flex lg:justify-start lg:px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 shadow-lg shadow-primary-500/20">
          <Image src="/icon.svg" alt="OlivERP" width={24} height={24} className="h-6 w-6" />
        </div>
        <span className="ml-3 hidden bg-gradient-to-r from-white to-slate-400 bg-clip-text text-xl font-bold tracking-tight text-transparent lg:block">
          OlivERP
        </span>
      </div>

      <nav className="flex flex-1 flex-row items-stretch justify-around overflow-x-auto px-0 py-0 lg:flex-col lg:justify-start lg:space-y-2 lg:overflow-y-auto lg:px-3 lg:py-6">
        {primaryItems.map((item) => (
          <NavLink key={item.path} item={item} active={isCurrent(currentPath, item.path)} search={search} />
        ))}

        {/* Behind "More" on the bottom bar, inline on the sidebar. */}
        {overflowItems.map((item) => (
          <NavLink
            key={item.path}
            item={item}
            active={isCurrent(currentPath, item.path)}
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
              const active = isCurrent(currentPath, item.path);
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
