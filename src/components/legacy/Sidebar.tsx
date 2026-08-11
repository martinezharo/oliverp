"use client";

import Link from "next/link";
import Image from "next/image";

import { ui } from "@/i18n/ui";

const t = (key: string) => ui.en[key] ?? key;

const menuItems = [
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
] as const;

export default function Sidebar({ currentPath, search }: { currentPath: string; search: string }) {
  return (
    <aside className="fixed bottom-0 left-0 right-0 z-40 flex h-16 flex-row border-t border-white/5 bg-[#0f1016]/95 backdrop-blur-xl transition-all duration-300 lg:bottom-auto lg:right-auto lg:top-0 lg:h-screen lg:w-64 lg:flex-col lg:border-r lg:border-t-0">
      <div className="hidden h-16 items-center justify-center border-b border-white/5 px-0 lg:flex lg:justify-start lg:px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 shadow-lg shadow-primary-500/20">
          <Image src="/icon.svg" alt="OlivERP" width={24} height={24} className="h-6 w-6" />
        </div>
        <span className="ml-3 hidden bg-gradient-to-r from-white to-slate-400 bg-clip-text text-xl font-bold tracking-tight text-transparent lg:block">
          OlivERP
        </span>
      </div>

      <nav className="flex flex-1 flex-row items-stretch justify-around overflow-x-auto px-0 py-0 lg:flex-col lg:justify-start lg:space-y-2 lg:overflow-y-auto lg:px-3 lg:py-6">
        {menuItems.map((item) => {
          const isActive = currentPath === item.path || currentPath.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.path}
              href={`${item.path}${search}`}
              className={`group relative flex min-w-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-xl px-0.5 py-2 transition-all duration-200 lg:flex-none lg:flex-row lg:justify-start lg:px-3 lg:py-3 ${isActive ? "bg-primary-500/10 text-primary-400" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 hidden h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary-500 shadow-[0_0_12px_rgba(var(--primary-500),0.8)] lg:block" />
              )}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 transition-transform group-hover:scale-110 lg:h-6 lg:w-6 ${isActive ? "text-primary-400" : "text-slate-500 group-hover:text-white"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
              </svg>
              <span className="mt-1 block max-w-full truncate whitespace-nowrap text-[9px] font-medium leading-tight tracking-tight lg:hidden">{"mobileLabel" in item ? item.mobileLabel : item.label}</span>
              <span className="ml-3 hidden font-medium tracking-wide lg:block">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
