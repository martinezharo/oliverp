"use client";

import { useState } from "react";

import { filterInput } from "@/components/ui/form";
import { useT } from "@/i18n/LocaleProvider";

export type FilterState = {
  search: string;
  type: string;
  channel: string;
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
};

export const emptyFilters: FilterState = {
  search: "",
  type: "",
  channel: "",
  dateFrom: "",
  dateTo: "",
  amountMin: "",
  amountMax: "",
};

const types = ["venta", "compra", "ingreso", "gasto"] as const;

export default function TransactionFilters({
  mode,
  setMode,
  channels,
  filters,
  onChange,
  onClear,
}: {
  mode: "daily" | "list";
  setMode: (mode: "daily" | "list") => void;
  channels: string[];
  filters: FilterState;
  onChange: (key: keyof FilterState, value: string) => void;
  onClear: () => void;
}) {
  const { t } = useT();
  const [moreOpen, setMoreOpen] = useState(false);
  // The range filters live behind "More", so the badge is the only sign they
  // are narrowing the list.
  const badgeCount = [filters.dateFrom, filters.dateTo, filters.amountMin, filters.amountMax].filter(Boolean).length;

  return (
    <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
      <div className="flex w-fit shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
        <ModeButton mode="daily" current={mode} onSelect={setMode} label={t("transactions.daily")} title={t("transactions.viewDaily")}>
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
        </ModeButton>
        <ModeButton mode="list" current={mode} onSelect={setMode} label={t("transactions.list")} title={t("transactions.viewList")}>
          <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </ModeButton>
      </div>

      {/* Filtering only applies to the flat list; the daily view is a rollup. */}
      <div className={`${mode === "list" ? "flex" : "hidden"} min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3`}>
        <div className="relative min-w-0 flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            value={filters.search}
            onChange={(event) => onChange("search", event.target.value)}
            placeholder={t("filters.search")}
            className={`${filterInput} pl-9`}
          />
        </div>

        <select value={filters.type} onChange={(event) => onChange("type", event.target.value)} className={`${filterInput} shrink-0 sm:w-40`}>
          <option value="">{t("filters.allTypes")}</option>
          {types.map((type) => (
            <option key={type} value={type}>{t(`filters.type${type.charAt(0).toUpperCase()}${type.slice(1)}`)}</option>
          ))}
        </select>

        <select value={filters.channel} onChange={(event) => onChange("channel", event.target.value)} className={`${filterInput} shrink-0 sm:w-40`}>
          <option value="">{t("filters.allChannels")}</option>
          {channels.map((channel) => <option key={channel} value={channel}>{channel}</option>)}
        </select>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 sm:w-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
            {t("filters.more")}
            {badgeCount > 0 && (
              <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-bold text-white">
                {badgeCount}
              </span>
            )}
          </button>

          <div className={`${moreOpen ? "block" : "hidden"} absolute right-0 top-full z-50 mt-2 w-72 space-y-4 rounded-xl border border-white/10 bg-[#0f1016] p-4 shadow-xl backdrop-blur-xl`}>
            <RangeGroup title={t("filters.dateRange")}>
              <RangeField label={t("filters.dateFrom")} type="date" value={filters.dateFrom} onChange={(value) => onChange("dateFrom", value)} />
              <RangeField label={t("filters.dateTo")} type="date" value={filters.dateTo} onChange={(value) => onChange("dateTo", value)} />
            </RangeGroup>

            <RangeGroup title={t("filters.amountRange")}>
              <RangeField label={t("filters.amountMin")} type="number" value={filters.amountMin} onChange={(value) => onChange("amountMin", value)} placeholder="0.00" />
              <RangeField label={t("filters.amountMax")} type="number" value={filters.amountMax} onChange={(value) => onChange("amountMax", value)} placeholder="0.00" />
            </RangeGroup>
          </div>
        </div>

        <button
          type="button"
          onClick={onClear}
          title={t("filters.clear")}
          className="hidden shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white sm:flex"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          <span className="hidden lg:inline">{t("filters.clear")}</span>
        </button>
      </div>
    </div>
  );
}

function ModeButton({
  mode,
  current,
  onSelect,
  label,
  title,
  children,
}: {
  mode: "daily" | "list";
  current: "daily" | "list";
  onSelect: (mode: "daily" | "list") => void;
  label: string;
  title: string;
  /** Paths of the 20x20 filled icon. */
  children: React.ReactNode;
}) {
  const active = current === mode;

  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      title={title}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${active ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">{children}</svg>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function RangeGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</div>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

function RangeField({
  label,
  type,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type: "date" | "number";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] text-slate-500">{label}</label>
      <input
        type={type}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={filterInput}
      />
    </div>
  );
}
