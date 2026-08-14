/**
 * The two shapes every settings screen is built from.
 *
 * They live apart from `SettingsPage` so a group of settings can be written as
 * its own component — the install control is the first — without either
 * copying the markup or importing the page it belongs to.
 */

/** A group of settings: a heading and a hairline-separated list of rows. */
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <ul className="mt-3 divide-y divide-white/5 border-y border-white/5">{children}</ul>
    </section>
  );
}

/**
 * One setting: what it is on the left, what you can do about it on the right.
 *
 * Below `sm` the two stack and the actions spread across the full width, so a
 * row stays tappable on a phone instead of squeezing two buttons into a corner.
 */
export function Row({
  title,
  badge,
  meta,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  meta?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium text-white">{title}</span>
          {badge}
        </div>
        {meta && <div className="mt-1 text-xs text-slate-500">{meta}</div>}
      </div>
      {children && (
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0 [&>button]:flex-1 sm:[&>button]:flex-none">
          {children}
        </div>
      )}
    </li>
  );
}
