/**
 * A small pill labelling the row it sits in — a project role, a key scope.
 *
 * The settings list and the API key list had the same eleven-class string
 * copied into each of them; it lives here so they cannot drift.
 */
export default function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-full border border-primary-500/20 bg-primary-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-400">
      {children}
    </span>
  );
}
