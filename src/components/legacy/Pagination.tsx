import Link from "next/link";

import { ui } from "@/i18n/ui";

const t = (key: string) => ui.en[key] ?? key;

export default function Pagination({ currentPage, totalPages, baseUrl }: { currentPage: number; totalPages: number; baseUrl: string }) {
  if (totalPages <= 1) return null;
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);
  const pages = Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);
  const url = (page: number) => `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}page=${page}`;
  return <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination"><Link href={currentPage > 1 ? url(currentPage - 1) : "#"} aria-disabled={currentPage <= 1} className={`flex items-center rounded-lg border border-white/10 px-3 py-2 transition-all ${currentPage > 1 ? "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white" : "pointer-events-none cursor-not-allowed bg-transparent text-slate-600"}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg><span className="ml-1 hidden sm:inline">{t("pagination.previous")}</span></Link><div className="flex items-center gap-1">{pages.map((page) => <Link key={page} href={url(page)} className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium transition-all ${page === currentPage ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"}`}>{page}</Link>)}</div><Link href={currentPage < totalPages ? url(currentPage + 1) : "#"} aria-disabled={currentPage >= totalPages} className={`flex items-center rounded-lg border border-white/10 px-3 py-2 transition-all ${currentPage < totalPages ? "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white" : "pointer-events-none cursor-not-allowed bg-transparent text-slate-600"}`}><span className="mr-1 hidden sm:inline">{t("pagination.next")}</span><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 011.414 0z" clipRule="evenodd" /></svg></Link></nav>;
}
