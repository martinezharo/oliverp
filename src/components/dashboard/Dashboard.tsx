"use client";

import EmptyProject from "@/components/ui/EmptyProject";
import { useT } from "@/i18n/LocaleProvider";
import { useErpContext, type ModalKind } from "@/hooks/useErpContext";
import { useFinanceRows } from "@/hooks/useErpData";

import DashboardStats from "./DashboardStats";
import RevenueChart from "./RevenueChart";

export default function Dashboard() {
  const { t } = useT();
  const { projectId, openModal } = useErpContext();
  const rows = useFinanceRows();

  if (!projectId) return <EmptyProject />;

  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <ActionCard
          tone="sale"
          title={t("index.newSale")}
          description={t("index.newSaleDesc")}
          onClick={() => openModal("sale")}
          watermark={
            <>
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </>
          }
          icon={
            <>
              <circle cx="8" cy="21" r="1" />
              <circle cx="19" cy="21" r="1" />
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
            </>
          }
        />

        <ActionCard
          tone="purchase"
          title={t("index.newPurchase")}
          description={t("index.newPurchaseDesc")}
          onClick={() => openModal("purchase")}
          watermark={
            <>
              <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
              <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
              <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
            </>
          }
          icon={
            <>
              <path d="m21 16-4 4-4-4" />
              <path d="M17 20V4" />
              <path d="m3 8 4-4 4 4" />
              <path d="M7 4v16" />
            </>
          }
        />

        <ActionCard
          tone="other"
          title={t("index.incomeExpense")}
          description={t("index.incomeExpenseDesc")}
          onClick={() => openModal("other")}
          watermark={
            <>
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" x2="22" y1="10" y2="10" />
            </>
          }
          icon={
            <>
              <path d="M12 2v20" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </>
          }
        />
      </div>

      {rows === undefined ? <StatsSkeleton /> : <DashboardStats transactions={rows} />}
      <RevenueChart projectId={projectId} />
    </>
  );
}

/** The three entry points to recording an operation. */
const cardTone = {
  sale: {
    surface: "from-indigo-500/10 to-purple-500/10 hover:shadow-indigo-500/20",
    badge: "bg-indigo-500/20 group-hover:bg-indigo-500/30",
    accent: "text-indigo-400",
    description: "text-indigo-200/60",
  },
  purchase: {
    surface: "from-emerald-500/10 to-teal-500/10 hover:shadow-emerald-500/20",
    badge: "bg-emerald-500/20 group-hover:bg-emerald-500/30",
    accent: "text-emerald-400",
    description: "text-emerald-200/60",
  },
  other: {
    surface: "from-pink-500/10 to-rose-500/10 hover:shadow-pink-500/20",
    badge: "bg-pink-500/20 group-hover:bg-pink-500/30",
    accent: "text-pink-400",
    description: "text-pink-200/60",
  },
} satisfies Record<Exclude<ModalKind, null | "product">, Record<string, string>>;

function ActionCard({
  tone,
  title,
  description,
  onClick,
  icon,
  watermark,
}: {
  tone: keyof typeof cardTone;
  title: string;
  description: string;
  onClick: () => void;
  /** Paths of the badge icon, stroked at width 2. */
  icon: React.ReactNode;
  /** Paths of the oversized background icon. */
  watermark: React.ReactNode;
}) {
  const { t } = useT();
  const colors = cardTone[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-3xl border border-white/5 bg-linear-to-br p-8 text-left transition-all hover:scale-[1.02] hover:shadow-2xl ${colors.surface}`}
    >
      <div className="absolute right-0 top-0 p-6 opacity-10 transition-opacity duration-500 group-hover:scale-110 group-hover:opacity-20">
        <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={colors.accent}>
          {watermark}
        </svg>
      </div>

      <div className="relative z-10">
        <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${colors.badge}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={colors.accent}>
            {icon}
          </svg>
        </div>
        <h3 className="mb-2 text-2xl font-bold text-white">{title}</h3>
        <p className={`max-w-[180px] text-sm leading-relaxed ${colors.description}`}>{description}</p>
        <div className={`mt-6 inline-flex items-center gap-2 text-sm font-medium transition-all group-hover:gap-3 ${colors.accent}`}>
          <span>{t("common.start")}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}

function StatsSkeleton() {
  const { t } = useT();
  return (
    <div className="mb-8 grid animate-pulse grid-cols-1 gap-6 md:grid-cols-4" aria-busy="true" aria-label={t("common.loadingData")}>
      {[0, 1, 2, 3].map((slot) => <div key={slot} className="h-28 rounded-2xl bg-white/5" />)}
    </div>
  );
}
