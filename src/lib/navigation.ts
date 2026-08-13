/**
 * The application's own routes, in one table.
 *
 * The ERP lives under `/app` so the root can serve the public landing page.
 * Every path is derived from `APP_ROOT` here rather than written by hand:
 * the sidebar, the header title and the post-login redirects all read this
 * module, so moving or adding a section is a single edit.
 */

export const APP_ROOT = "/app";

/** `appPath()` → `/app`; `appPath("stock")` → `/app/stock`. */
export function appPath(segment = ""): string {
    return segment ? `${APP_ROOT}/${segment}` : APP_ROOT;
}

/** True for the given page and for anything nested under it. */
function isUnder(currentPath: string, path: string): boolean {
    return currentPath === path || currentPath.startsWith(`${path}/`);
}

export type AppSection = {
    /** Path segment under `APP_ROOT`; empty for the dashboard itself. */
    segment: string;
    /** Sidebar label, and the shorter one the bottom bar uses when it differs. */
    navKey: string;
    mobileLabel?: string;
    /** Document title, shown in the header after `split("|")`. */
    titleKey: string;
    /**
     * `primary` stays on the mobile bottom bar; `overflow` moves behind its
     * "More" button. The sidebar renders both inline.
     */
    group: "primary" | "overflow";
    /** `d` of the 24×24 stroked icon. */
    icon: string;
};

export const APP_SECTIONS: AppSection[] = [
    {
        segment: "",
        navKey: "nav.home",
        titleKey: "title.dashboard",
        group: "primary",
        icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    },
    {
        segment: "stock",
        navKey: "nav.stock",
        titleKey: "title.stock",
        group: "primary",
        icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    },
    {
        segment: "transacciones",
        navKey: "nav.transactions",
        titleKey: "title.transactions",
        group: "primary",
        icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    {
        segment: "historial",
        navKey: "nav.history",
        titleKey: "title.history",
        group: "primary",
        icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    },
    {
        segment: "plugins",
        navKey: "nav.plugins",
        titleKey: "title.plugins",
        group: "overflow",
        icon: "M8.5 3v4.5H4M15.5 3v4.5H20M8.5 21v-4.5H4M15.5 21v-4.5H20 M9.5 7.5h5a2 2 0 012 2v5a2 2 0 01-2 2h-5a2 2 0 01-2-2v-5a2 2 0 012-2z",
    },
    {
        segment: "ajustes",
        navKey: "nav.settings",
        titleKey: "title.settings",
        group: "overflow",
        icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    },
    {
        segment: "documentacion",
        navKey: "nav.documentation",
        mobileLabel: "Docs",
        titleKey: "title.documentation",
        group: "overflow",
        icon: "M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z M8 7h8M8 11h6",
    },
];

/**
 * Sections ordered from the most specific path to the least, so a lookup can
 * stop at the first match. The dashboard's path is a prefix of every other
 * one, so it has to be tried last or it would answer for all of them.
 */
const SECTIONS_BY_SPECIFICITY = APP_SECTIONS
    .map((section) => ({ path: appPath(section.segment), titleKey: section.titleKey }))
    .sort((a, b) => b.path.length - a.path.length);

/**
 * Path of the section a page belongs to, including nested pages:
 * `/app/documentacion/api` resolves to the documentation section. Compare a
 * section's path against this to know whether it is the current one.
 */
export function activeSectionPath(pathname: string): string {
    return SECTIONS_BY_SPECIFICITY.find((section) => isUnder(pathname, section.path))?.path ?? appPath();
}

/** Title key for a page, resolved through its section. */
export function titleKeyFor(pathname: string): string {
    const match = SECTIONS_BY_SPECIFICITY.find((section) => isUnder(pathname, section.path));
    return match?.titleKey ?? "title.dashboard";
}
