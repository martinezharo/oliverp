import { t } from "@/i18n/t";

import { APP_DOMAIN } from "./content";
import { CARD, Label } from "./ui";

/**
 * A still of the dashboard, built from the same surfaces as the real one.
 *
 * It is markup rather than a screenshot so it stays sharp at any width, keeps
 * the app's exact tints, and never goes stale against a redesign of the cards.
 */

/** Daily income, as a share of the chart height. */
const SERIES = [14, 41, 20, 58, 31, 67, 25, 53, 84, 43, 72, 36, 90, 61, 96, 70];

const CHART_WIDTH = 600;
const CHART_HEIGHT = 150;

/**
 * A smooth curve through the series, the way Chart.js draws it with
 * `tension: 0.4`: every point is joined by a cubic whose control points sit on
 * the horizontal midpoint between neighbours.
 */
function curve(values: number[]): string {
  const step = CHART_WIDTH / (values.length - 1);
  const points = values.map((value, index) => [index * step, CHART_HEIGHT - (value / 100) * CHART_HEIGHT]);
  return points.reduce((path, [x, y], index) => {
    if (index === 0) return `M ${x} ${y}`;
    const [previousX, previousY] = points[index - 1];
    const middle = (previousX + x) / 2;
    return `${path} C ${middle} ${previousY}, ${middle} ${y}, ${x} ${y}`;
  }, "");
}

const NAV = [
  { label: t("nav.home"), active: true, icon: <><path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><path d="M9 21v-7h6v7" /></> },
  { label: t("nav.stock"), active: false, icon: <><path d="m21 8-9-5-9 5 9 5 9-5Z" /><path d="m3 12 9 5 9-5" /></> },
  { label: t("nav.transactions"), active: false, icon: <><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></> },
  { label: t("nav.history"), active: false, icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> },
];

/** `compact` drops the sidebar, for the narrow columns of the split layout. */
export function AppPreview({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-3xl border border-white/10 bg-[#0f1016] shadow-2xl shadow-black/60 ${className}`}>
      <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.02] px-4 py-3">
        {/* The traffic lights, in the colours macOS actually paints them. */}
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 font-mono text-[11px] text-slate-500">{APP_DOMAIN}</span>
      </div>

      <div className="flex">
        {!compact && (
          <aside className="hidden w-48 shrink-0 flex-col gap-1 border-r border-white/5 p-3 sm:flex">
            {NAV.map((item) => (
              <span
                key={item.label}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${item.active ? "bg-primary-500/10 text-blue-300" : "text-slate-500"}`}
              >
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {item.icon}
                </svg>
                {item.label}
              </span>
            ))}
          </aside>
        )}

        <div className="min-w-0 flex-1 space-y-3 p-3 sm:space-y-4 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            <StatTile
              tone="blue"
              label={t("dashboard.balanceMonth", { month: t("landing.preview.month") })}
              value={t("landing.preview.balanceValue")}
              foot={t("landing.preview.balanceFoot", {
                income: t("landing.preview.balanceIncome"),
                expenses: t("landing.preview.balanceExpenses"),
              })}
            />
            <StatTile
              tone="purple"
              label={`${t("finance.vatBalance")} ${t("dashboard.quarterShort", { n: 1 })}`}
              value={t("landing.preview.vatValue")}
              valueClass="text-emerald-400"
              foot={t("landing.preview.vatFoot", {
                supported: t("landing.preview.vatSupported"),
                charged: t("landing.preview.vatCharged"),
              })}
            />
            <StatTile
              tone="amber"
              label={t("dashboard.projection", { month: t("landing.preview.month") })}
              value={t("landing.preview.projectionValue")}
              foot={t("dashboard.day", { current: 26, total: 28 })}
              progress={93}
            />
          </div>

          <RevenuePreview />
        </div>
      </div>
    </div>
  );
}

/** The still of `RevenueChart`: same header, same emerald filled line. */
function RevenuePreview() {
  return (
    <div className={`${CARD} p-3.5 sm:p-4`}>
      <div className="mb-4 flex items-center justify-between gap-4 sm:mb-5">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </span>
          <div>
            <h3 className="text-sm font-bold text-white">{t("chart.title")}</h3>
            <p className="text-[11px] text-slate-400">
              {t("chart.totalPeriod")} <span className="font-bold text-emerald-400">{t("landing.preview.revenueTotal")}</span>
            </p>
          </div>
        </div>
        <div className="hidden rounded-lg border border-white/5 bg-white/5 p-1 text-[11px] font-medium sm:flex">
          <span className="rounded-md px-2.5 py-1 text-slate-400">{t("chart.days7")}</span>
          <span className="rounded-md bg-white/10 px-2.5 py-1 text-white">{t("chart.days30")}</span>
          <span className="rounded-md px-2.5 py-1 text-slate-400">{t("chart.days90")}</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none" className="h-32 w-full" aria-hidden="true">
        <defs>
          <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((fraction) => (
          <line
            key={fraction}
            x1="0"
            x2={CHART_WIDTH}
            y1={CHART_HEIGHT * fraction}
            y2={CHART_HEIGHT * fraction}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
        ))}
        <path d={`${curve(SERIES)} L ${CHART_WIDTH} ${CHART_HEIGHT} L 0 ${CHART_HEIGHT} Z`} fill="url(#revenue-fill)" />
        <path d={curve(SERIES)} fill="none" stroke="#10b981" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function StatTile({
  tone,
  label,
  value,
  valueClass = "text-white",
  foot,
  progress,
}: {
  tone: "blue" | "purple" | "amber";
  label: string;
  value: string;
  valueClass?: string;
  foot: string;
  progress?: number;
}) {
  return (
    <div className={`${CARD} p-3.5 sm:p-4`}>
      <Label tone={tone} className="mb-2.5 text-[10px] sm:mb-3">{label}</Label>
      <p className={`text-xl font-bold sm:text-2xl ${valueClass}`}>{value}</p>
      {progress !== undefined && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-amber-500/50" style={{ width: `${progress}%` }} />
        </div>
      )}
      <p className="mt-2 text-[11px] text-slate-500">{foot}</p>
    </div>
  );
}
