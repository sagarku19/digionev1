// Pure array reorder. Out-of-range indices yield an unchanged copy.
export function moveItem<T>(arr: readonly T[], from: number, to: number): T[] {
  const next = arr.slice();
  if (from < 0 || from >= next.length || to < 0 || to >= next.length) return next;
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
