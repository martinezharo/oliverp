import Link from "next/link";
import { notFound } from "next/navigation";

import { documentationEntries, documentationEntry, renderDocumentation } from "@/lib/documentation";
import { appPath } from "@/lib/navigation";

export default async function DocumentationArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = documentationEntry(slug);
  if (!entry) notFound();
  const html = renderDocumentation(entry);
  return <div className="grid gap-7 xl:grid-cols-[230px_minmax(0,1fr)]"><aside><Link href={appPath("documentacion")} className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-white">← All documentation</Link><nav className="flex gap-2 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible xl:pb-0">{documentationEntries.map((item) => <Link key={item.slug} href={appPath(`documentacion/${item.slug}`)} className={`whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm transition-colors ${item.slug === slug ? "bg-primary-500/10 font-medium text-primary-300" : "text-slate-500 hover:bg-white/[0.035] hover:text-white"}`}>{item.title}</Link>)}</nav></aside><article className="min-w-0 overflow-hidden rounded-3xl border border-white/[0.07] bg-[#14151a]/60"><header className="border-b border-white/5 bg-gradient-to-r from-white/[0.035] to-transparent px-6 py-7 sm:px-9"><div className="text-[10px] font-bold uppercase tracking-[0.17em] text-primary-400">{entry.file}</div><h1 className="mt-2 text-2xl font-bold tracking-tight text-white">{entry.title}</h1><p className="mt-2 text-sm text-slate-500">{entry.description}</p></header><div className="docs-prose px-6 py-8 sm:px-9" dangerouslySetInnerHTML={{ __html: html }} /></article></div>;
}
