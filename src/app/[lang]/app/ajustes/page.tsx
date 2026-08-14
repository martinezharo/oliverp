import SettingsPage from "@/components/settings/SettingsPage";

import { privatePageMetadata } from "@/i18n/page-metadata";

export const generateMetadata = privatePageMetadata("title.settings");

export default function Page() {
  return <SettingsPage />;
}
