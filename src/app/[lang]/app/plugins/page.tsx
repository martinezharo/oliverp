import PluginsPage from "@/components/plugins/PluginsPage";

import { privatePageMetadata } from "@/i18n/page-metadata";

export const generateMetadata = privatePageMetadata("title.plugins");

export default function Page() {
  return <PluginsPage />;
}
