/**
 * The accent palette of the landing page.
 *
 * These are the same tints the dashboard already paints its action and stat
 * cards with (`Dashboard.tsx`, `DashboardStats.tsx`), lifted into one map so a
 * landing surface and an application surface cannot drift apart.
 */
export const TONES = {
  indigo: {
    surface: "from-indigo-500/10 to-purple-500/10",
    glow: "hover:shadow-indigo-500/20",
    badge: "bg-indigo-500/20 group-hover:bg-indigo-500/30",
    accent: "text-indigo-400",
    dot: "bg-indigo-500",
    body: "text-indigo-200/60",
  },
  emerald: {
    surface: "from-emerald-500/10 to-teal-500/10",
    glow: "hover:shadow-emerald-500/20",
    badge: "bg-emerald-500/20 group-hover:bg-emerald-500/30",
    accent: "text-emerald-400",
    dot: "bg-emerald-500",
    body: "text-emerald-200/60",
  },
  pink: {
    surface: "from-pink-500/10 to-rose-500/10",
    glow: "hover:shadow-pink-500/20",
    badge: "bg-pink-500/20 group-hover:bg-pink-500/30",
    accent: "text-pink-400",
    dot: "bg-pink-500",
    body: "text-pink-200/60",
  },
  blue: {
    surface: "from-blue-500/10 to-sky-500/10",
    glow: "hover:shadow-blue-500/20",
    badge: "bg-blue-500/20 group-hover:bg-blue-500/30",
    accent: "text-blue-400",
    dot: "bg-blue-500",
    body: "text-blue-200/60",
  },
  purple: {
    surface: "from-purple-500/10 to-violet-500/10",
    glow: "hover:shadow-purple-500/20",
    badge: "bg-purple-500/20 group-hover:bg-purple-500/30",
    accent: "text-purple-400",
    dot: "bg-purple-500",
    body: "text-purple-200/60",
  },
  amber: {
    surface: "from-amber-500/10 to-orange-500/10",
    glow: "hover:shadow-amber-500/20",
    badge: "bg-amber-500/20 group-hover:bg-amber-500/30",
    accent: "text-amber-400",
    dot: "bg-amber-500",
    body: "text-amber-200/60",
  },
} as const;

export type Tone = keyof typeof TONES;
