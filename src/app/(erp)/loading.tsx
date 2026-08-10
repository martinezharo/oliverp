/**
 * Streamed while a page segment is still on the wire. It replaces only the
 * content area — the layout above it, and therefore the whole shell, is
 * already painted.
 */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true">
      <div className="h-10 w-64 rounded-xl bg-white/5" />
      <div className="h-72 rounded-3xl bg-white/5" />
    </div>
  );
}
