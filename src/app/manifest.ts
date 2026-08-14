import type { MetadataRoute } from "next";

import { DEFAULT_LOCALE } from "@/i18n/locale";
import { getTranslator } from "@/i18n/t";
import { APP_SECTIONS, appPath } from "@/lib/navigation";
import {
  PWA_BACKGROUND_COLOR,
  PWA_ICONS,
  PWA_START_URL,
  PWA_THEME_COLOR,
} from "@/lib/pwa";

/**
 * The web app manifest, served from `/manifest.webmanifest`.
 *
 * `id` is what a browser uses to recognise an already-installed copy, so it is
 * pinned to a constant rather than derived from `start_url`: moving the entry
 * point later must not orphan everyone's installation and offer them a second
 * one beside it.
 *
 * There is one manifest per origin and it has no route of its own to carry a
 * language, so it is written in the default one. What it names — the product,
 * and three sections of it — is the same word in both languages more often
 * than not, and an installed icon is labelled once, at install time.
 */
export default function manifest(): MetadataRoute.Manifest {
  const { t } = getTranslator(DEFAULT_LOCALE);

  return {
    id: "/?pwa",
    name: t("pwa.name"),
    short_name: t("pwa.shortName"),
    description: t("pwa.description"),
    start_url: PWA_START_URL,
    // The whole origin, so the login round-trip and a link back to the
    // landing page stay inside the installed window.
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: PWA_BACKGROUND_COLOR,
    theme_color: PWA_THEME_COLOR,
    lang: "en",
    dir: "ltr",
    categories: ["business", "finance", "productivity"],
    icons: PWA_ICONS,
    // The same still the landing page shows, so the install dialog previews
    // the actual application rather than a mock-up of it.
    screenshots: [
      {
        src: "/dashboard_preview.png",
        sizes: "1360x768",
        type: "image/png",
        form_factor: "wide",
      },
    ],
    // Long-pressing the installed icon jumps straight into a section. The
    // list is derived from the navigation table so a new section is offered
    // here without a second edit.
    shortcuts: APP_SECTIONS.filter(
      (section) => section.group === "primary" && section.segment !== "",
    ).map((section) => ({
      name: t(section.navKey),
      url: appPath(section.segment),
    })),
  };
}
