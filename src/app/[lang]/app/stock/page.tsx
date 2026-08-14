import StockPage from "@/components/stock/StockPage";

import { privatePageMetadata } from "@/i18n/page-metadata";

export const generateMetadata = privatePageMetadata("title.stock");

export default function Stock() {
  return <StockPage />;
}
