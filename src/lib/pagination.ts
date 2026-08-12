/** A window of at most `maxVisible` page numbers centred on the current one. */
export function visiblePages(currentPage: number, totalPages: number, maxVisible = 5): number[] {
  if (totalPages < 1) return [];
  // The window is anchored two pages behind the current one, then pushed back
  // when it would run past the last page, so it always shows `maxVisible`
  // entries while enough pages exist.
  const end = Math.min(totalPages, Math.max(1, currentPage - 2) + maxVisible - 1);
  const start = Math.max(1, end - maxVisible + 1);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
