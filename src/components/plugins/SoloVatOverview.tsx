"use client";

import { useMemo, useState } from "react";

import type { FinanceRow } from "@/components/legacy/types";

type Period = "quarter" | "year" | "all";
type Totals = { output: number; input: number };

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

function rowDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00`);
}

function sumVat(rows: FinanceRow[]): Totals {
  return rows.reduce((totals, row) => ({
    output: totals.output + (row.iva_repercutido || 0),
    input: totals.input + (row.iva_soportado || 0),
  }), { output: 0, input: 0 });
}

export default function SoloVatOverview({ transactions }: { transactions: FinanceRow[] }) {
  const [period, setPeriod] = useState<Period>("year");
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.floor(new Date().getMonth() / 3);
  const selectedRows = useMemo(() => transactions.filter((row) => {
    if (period === "all") return true;
    const date = rowDate(row.dia);
    if (date.getFullYear() !== currentYear) return false;
    return period === "year" || Math.floor(date.getMonth() / 3) === currentQuarter;
  }), [currentQuarter, currentYear, period, transactions]);
  const totals = useMemo(() => sumVat(selectedRows), [selectedRows]);
  const settlement = totals.output - totals.input;
  const quarters = useMemo(() => {
    const grouped = new Map<string, Totals>();
    for (const row of transactions) {
      const date = rowDate(row.dia);
      const key = `${date.getFullYear()} Q${Math.floor(date.getMonth() / 3) + 1}`;
      const previous = grouped.get(key) ?? { output: 0, input: 0 };
      previous.output += row.iva_repercutido || 0;
      previous.input += row.iva_soportado || 0;
      grouped.set(key, previous);
    }
    return [...grouped.entries()].sort(([left], [right]) => right.localeCompare(left));
  }, [transactions]);

  return (
    <section className="mb-8" aria-labelledby="solo-vat-heading">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-primary-400">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-400 shadow-[0_0_12px_rgba(129,140,248,.8)]" />
            Solo IVA active
          </div>
          <h2 id="solo-vat-heading" className="text-xl font-semibold text-white">VAT overview</h2>
          <p className="mt-1 text-sm text-slate-500">Your private plugin is focusing the normal dashboard on VAT settlements.</p>
        </div>
        <div className="flex w-fit rounded-xl border border-white/[0.07] bg-white/[0.025] p-1" role="group" aria-label="VAT reporting period">
          {(["quarter", "year", "all"] as const).map((value) => (
            <button key={value} type="button" onClick={() => setPeriod(value)} className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize transition-colors ${period === value ? "bg-primary-500/15 text-primary-300" : "text-slate-600 hover:text-slate-300"}`}>{value}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <VatCard label="Output VAT" value={totals.output} detail="Charged on confirmed sales" tone="rose" />
        <VatCard label="Input VAT" value={totals.input} detail="Deductible on received purchases" tone="emerald" />
        <VatCard label="Settlement" value={Math.abs(settlement)} detail={settlement > 0 ? "Payable" : settlement < 0 ? "In your favour" : "Balanced"} tone={settlement < 0 ? "emerald" : "violet"} />
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border border-white/[0.07] bg-[#14151a]/70">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-200">Quarterly settlements</h3>
          <span className="text-xs text-slate-600">{quarters.length ? `${quarters.length} quarter${quarters.length === 1 ? "" : "s"}` : "No data"}</span>
        </div>
        {quarters.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-slate-600"><tr><th className="px-5 py-3 text-left">Period</th><th className="px-5 py-3 text-right">Output VAT</th><th className="px-5 py-3 text-right">Input VAT</th><th className="px-5 py-3 text-right">Settlement</th></tr></thead>
              <tbody>{quarters.map(([label, values]) => { const value = values.output - values.input; return <tr key={label} className="border-t border-white/[0.045]"><td className="px-5 py-3 font-semibold text-slate-300">{label}</td><td className="px-5 py-3 text-right text-slate-400">{currency.format(values.output)}</td><td className="px-5 py-3 text-right text-slate-400">{currency.format(values.input)}</td><td className={`px-5 py-3 text-right font-semibold ${value > 0 ? "text-rose-400" : value < 0 ? "text-emerald-400" : "text-slate-500"}`}>{currency.format(value)}</td></tr>; })}</tbody>
            </table>
          </div>
        ) : <div className="px-6 py-12 text-center text-sm text-slate-600">Confirmed sales and purchases will appear here.</div>}
      </div>
    </section>
  );
}

function VatCard({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: "rose" | "emerald" | "violet" }) {
  const tones = { rose: "text-rose-400 bg-rose-500", emerald: "text-emerald-400 bg-emerald-500", violet: "text-primary-300 bg-primary-500" };
  const [text, glow] = tones[tone].split(" ");
  return <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#14151a] p-6"><span className={`absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10 blur-3xl ${glow}`} /><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">{label}</p><p className={`relative mt-3 font-mono text-2xl font-bold tracking-tight ${text}`}>{currency.format(value)}</p><p className="mt-1 text-xs text-slate-600">{detail}</p></div>;
}
