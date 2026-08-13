import Link from "next/link";

import { documentationEntries } from "@/lib/documentation";
import { appPath } from "@/lib/navigation";

const icons: Record<string, string> = {
  overview: "M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z",
  plugins: "M8.5 3v4.5H4M15.5 3v4.5H20M8.5 21v-4.5H4M15.5 21v-4.5H20M9.5 7.5h5a2 2 0 012 2v5a2 2 0 01-2 2h-5a2 2 0 01-2-2v-5a2 2 0 012-2z",
  api: "M8 9l-3 3 3 3m8-6 3 3-3 3m-5 4 2-14",
  database: "M4 6c0 1.66 3.58 3 8 3s8-1.34 8-3-3.58-3-8-3-8 1.34-8 3zm0 0v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6m-16 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6",
  audit: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zm-3-10 2 2 4-4",
  contributing: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2m7-10a4 4 0 100-8 4 4 0 000 8zm13 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
};

export default function DocumentationIndex() {
  return <div className="space-y-8"><header><div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-400">Knowledge base</div><h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent">Documentation</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">The repository guides, rendered alongside the product and kept versioned with the code they describe.</p></header><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{documentationEntries.map((entry) => <Link key={entry.slug} href={appPath(`documentacion/${entry.slug}`)} className={`docs-card docs-card-${entry.accent} group relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#14151a]/65 p-6 transition-all hover:-translate-y-0.5 hover:border-white/15 hover:shadow-2xl hover:shadow-black/20`}><div className="docs-card-glow absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-20 blur-3xl transition-opacity group-hover:opacity-35" /><div className="relative"><div className="docs-card-icon flex h-11 w-11 items-center justify-center rounded-2xl border bg-white/[0.035]"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={icons[entry.slug]} /></svg></div><h2 className="mt-5 font-semibold text-white">{entry.title}</h2><p className="mt-2 min-h-10 text-sm leading-5 text-slate-500">{entry.description}</p><div className="mt-5 flex items-center gap-2 text-xs font-semibold text-slate-500 transition-colors group-hover:text-white">Read document <span className="transition-transform group-hover:translate-x-1">→</span></div></div></Link>)}</div></div>;
}
