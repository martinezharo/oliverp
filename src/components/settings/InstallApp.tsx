"use client";

import { useState } from "react";

import Badge from "@/components/ui/Badge";
import { Row, Section } from "@/components/settings/rows";
import { secondaryButton } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { t } from "@/i18n/t";
import { promptInstall } from "@/lib/install-prompt";

/**
 * Installing OlivERP, from inside OlivERP.
 *
 * Browsers only let a page open the install dialog while replaying an event
 * they handed out themselves, so there are three things this row can be, and
 * it is never a button that does nothing:
 *
 * - already installed — say so, and offer nothing;
 * - the browser offered a prompt — a button that replays it;
 * - otherwise (Safari, or an install the browser has not offered) — the one
 *   sentence that explains where the browser keeps the option instead.
 */
export function InstallApp() {
  const { canPrompt, installed } = useInstallPrompt();
  const [busy, setBusy] = useState(false);

  async function install() {
    setBusy(true);
    try {
      await promptInstall();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title={t("settings.app.title")}>
      <Row
        title={t(installed ? "settings.install.installedTitle" : "settings.install.title")}
        badge={installed ? <Badge>{t("settings.install.installed")}</Badge> : undefined}
        meta={t(
          installed
            ? "settings.install.installedMeta"
            : canPrompt
              ? "settings.install.meta"
              : "settings.install.manual",
        )}
      >
        {!installed && canPrompt && (
          <button type="button" disabled={busy} onClick={() => void install()} className={`${secondaryButton} sm:min-w-40`}>
            {t(busy ? "settings.install.installing" : "settings.install.action")}
          </button>
        )}
      </Row>
    </Section>
  );
}
