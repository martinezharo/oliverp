import HistoryPage from "@/components/history/HistoryPage";

import { privatePageMetadata } from "@/i18n/page-metadata";

export const generateMetadata = privatePageMetadata("title.history");

export default function History() {
  return <HistoryPage />;
}
