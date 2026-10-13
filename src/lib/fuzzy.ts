export interface FuzzyResult {
  score: number;
  /** Indexes in `text` that matched, for highlighting. */
  indexes: number[];
}

/**
 * Subsequence match: every query character must appear in order.
 * Consecutive runs and word starts score higher; shorter text wins ties.
 */
export function fuzzyMatch(query: string, text: string): FuzzyResult | null {
  const q = query.trim().toLowerCase();
  if (!q) return { score: 0, indexes: [] };
  const t = text.toLowerCase();
  const indexes: number[] = [];
  let score = 0;
  let from = 0;
  let prev = -2;
  for (const ch of q) {
    const i = t.indexOf(ch, from);
    if (i < 0) return null;
    indexes.push(i);
    score += 1;
    if (i === prev + 1) score += 3; // consecutive
    if (i === 0 || /[\s\-_/·]/.test(t[i - 1] ?? '')) score += 2; // word start
    prev = i;
    from = i + 1;
  }
  score -= text.length * 0.01;
  return { score, indexes };
}

export function rankBy<T>(items: readonly T[], query: string, label: (item: T) => string) {
  return items
    .map((item) => ({ item, match: fuzzyMatch(query, label(item)) }))
    .filter((r): r is { item: T; match: FuzzyResult } => r.match !== null)
    .sort((a, b) => b.match.score - a.match.score);
}
