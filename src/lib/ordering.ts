import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing';

export interface Positioned {
  id: string;
  position: string;
}

/** Deterministic order. Ties (from concurrent moves to the same slot) break on id. */
export function compareByPosition(a: Positioned, b: Positioned): number {
  if (a.position < b.position) return -1;
  if (a.position > b.position) return 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function sortByPosition<T extends Positioned>(items: readonly T[]): T[] {
  return [...items].sort(compareByPosition);
}

/** True when every position is strictly greater than the one before it. */
export function isStrictlyOrdered(sorted: readonly Positioned[]): boolean {
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1]!.position >= sorted[i]!.position) return false;
  }
  return true;
}

/** A fresh, evenly spaced set of keys. Used to repair collisions. */
export function rebalance(count: number): string[] {
  return generateNKeysBetween(null, null, count);
}

/** Position for inserting at `index` among `sorted` siblings (which must be strictly ordered). */
export function positionAt(sorted: readonly Positioned[], index: number): string {
  const i = Math.max(0, Math.min(index, sorted.length));
  const before = i > 0 ? sorted[i - 1]!.position : null;
  const after = i < sorted.length ? sorted[i]!.position : null;
  return generateKeyBetween(before, after);
}

export function positionAtEnd(sorted: readonly Positioned[]): string {
  return positionAt(sorted, sorted.length);
}
