import { localeHref } from "@/i18n/locale";
import type { Translator } from "@/i18n/t";
import { APP_ROOT, documentationPath } from "@/lib/navigation";
import { SITE_DOMAIN } from "@/lib/site";

import type { Tone } from "./tones";

/**
 * Everything the landing page says, in one place, so the copy can be revised
 * without going through the layout.
 *
 * The claims are the ones the repository can back: the licence (`LICENSE`),
 * the machine-facing API and its OpenAPI contract (`docs/API.md`), and plugins
 * as private per-project extensions (`docs/PLUGINS.md`).
 *
 * It is a function of the page's language rather than a table of constants.
 * The copy is most of what makes the Spanish page Spanish, and its links have
 * to keep the reader in the language they arrived in. The page builds this
 * once on the server and passes the pieces down, so nothing underneath has to
 * become a client component merely to be able to translate itself.
 */

/** Sets the demo cookie on the Worker and redirects into the app. */
export const DEMO_HREF = "/api/demo/start";

export const GITHUB_HREF = "https://github.com/martinezharo/oliverp";
export const GITHUB_REPO = "martinezharo/oliverp";

export type Module = {
  title: string;
  description: string;
  tone: Tone;
  /** Badge icon paths, stroked at width 2 on a 24×24 viewBox. */
  icon: React.ReactNode;
};

export type FooterLinkSpec = {
  href: string;
  label: string;
  /** A plain anchor rather than a `Link`: the demo sets its cookie on the
   *  redirect, and GitHub leaves the site. */
  native?: boolean;
  newTab?: boolean;
};

export type LandingContent = ReturnType<typeof landingContent>;

export function landingContent({ t, lang }: Translator) {
  /** Local destinations keep the language; `DEMO_HREF` and GitHub do not. */
  const inApp = (path: string) => localeHref(lang, path);

  const hero = {
    eyebrow: t("landing.hero.eyebrow"),
    title: [
      t("landing.hero.title.before"),
      t("landing.hero.title.highlight"),
      t("landing.hero.title.after"),
    ] as const,
    lede: t("landing.hero.lede"),
    note: t("landing.hero.note"),
  };

  const modules: Module[] = [
    {
      title: t("landing.modules.sales.title"),
      description: t("landing.modules.sales.description"),
      tone: "indigo",
      icon: (
        <>
          <circle cx="8" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </>
      ),
    },
    {
      title: t("landing.modules.stock.title"),
      description: t("landing.modules.stock.description"),
      tone: "emerald",
      icon: (
        <>
          <path d="m21 8-9-5-9 5 9 5 9-5Z" />
          <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
        </>
      ),
    },
    {
      title: t("landing.modules.transactions.title"),
      description: t("landing.modules.transactions.description"),
      tone: "pink",
      icon: (
        <>
          <path d="M12 2v20" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </>
      ),
    },
    {
      title: t("landing.modules.dashboard.title"),
      description: t("landing.modules.dashboard.description"),
      tone: "blue",
      icon: (
        <>
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </>
      ),
    },
    {
      title: t("landing.modules.history.title"),
      description: t("landing.modules.history.description"),
      tone: "purple",
      icon: (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      ),
    },
    {
      title: t("landing.modules.plugins.title"),
      description: t("landing.modules.plugins.description"),
      tone: "amber",
      icon: (
        <>
          <path d="M12 8V4H8" />
          <rect width="16" height="12" x="4" y="8" rx="2" />
          <path d="M2 14h2M20 14h2M9 13v2M15 13v2" />
        </>
      ),
    },
  ];

  /**
   * The three things worth saying beyond the module list, said once each.
   * `code`, when present, is shown as a mono line inside the card.
   */
  const claims = [
    {
      tone: "blue" as Tone,
      title: t("landing.claims.noManual.title"),
      description: t("landing.claims.noManual.description"),
    },
    {
      tone: "emerald" as Tone,
      title: t("landing.claims.openSource.title"),
      description: t("landing.claims.openSource.description"),
      repo: true,
    },
    {
      tone: "purple" as Tone,
      title: t("landing.claims.agents.title"),
      description: t("landing.claims.agents.description"),
      // The API has one address in either language: it answers programs.
      code: `${SITE_DOMAIN}/api/v1/openapi.json`,
    },
  ];

  const demo = {
    eyebrow: t("landing.demo.eyebrow"),
    title: t("landing.demo.title"),
    description: t("landing.demo.description"),
    cta: t("landing.demo.cta"),
  };

  const navLinks = [
    { href: "#modulos", label: t("landing.nav.modules") },
    { href: "#demo", label: t("landing.nav.demo") },
  ];

  /** The two calls to action that appear all over the page. */
  const cta = {
    enter: t("landing.cta.enter"),
    enterSuffix: t("landing.cta.enterSuffix"),
    demo: t("landing.cta.demo"),
    enterHref: inApp(APP_ROOT),
    homeHref: inApp("/"),
  };

  /**
   * The footer, in two columns so the four links read as two ideas — the
   * product you can use and the project behind it — instead of one
   * undifferentiated row.
   */
  const footer = {
    tagline: t("landing.footer.tagline"),
    legal: t("landing.footer.legal"),
    groups: [
      {
        title: t("landing.footer.product"),
        links: [
          { href: inApp(APP_ROOT), label: t("landing.footer.enter") },
          { href: DEMO_HREF, label: t("landing.footer.demo"), native: true },
        ] satisfies FooterLinkSpec[],
      },
      {
        title: t("landing.footer.project"),
        links: [
          { href: inApp(documentationPath()), label: t("landing.footer.docs") },
          // A wrapping label rather than the `owner/repo` slug: the slug is one
          // unbreakable 157px run and these columns are ~124px wide at 320px.
          { href: GITHUB_HREF, label: t("landing.footer.github"), native: true, newTab: true },
        ] satisfies FooterLinkSpec[],
      },
    ],
  };

  return { hero, modules, claims, demo, navLinks, cta, footer };
}
