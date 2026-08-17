import DocumentationLayout from "@/components/documentation/DocumentationLayout";
import { resolveLang, type LangParams } from "@/i18n/params";

export default async function Layout({ children, ...props }: LangParams & { children: React.ReactNode }) {
  const lang = await resolveLang(props);
  return <DocumentationLayout lang={lang}>{children}</DocumentationLayout>;
}
