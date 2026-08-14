import Dashboard from "@/components/dashboard/Dashboard";

import { privatePageMetadata } from "@/i18n/page-metadata";

export const generateMetadata = privatePageMetadata("title.dashboard");

export default function HomePage() {
  return <Dashboard />;
}
