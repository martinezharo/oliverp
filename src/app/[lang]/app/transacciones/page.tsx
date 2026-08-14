import TransactionsPage from "@/components/transactions/TransactionsPage";

import { privatePageMetadata } from "@/i18n/page-metadata";

export const generateMetadata = privatePageMetadata("title.transactions");

export default function Transactions() {
  return <TransactionsPage />;
}
