import type { Application } from './types';

export interface Filters {
  q: string;
  stale: boolean;
  remote: boolean;
  reminder: boolean;
}

export const NO_FILTERS: Filters = { q: '', stale: false, remote: false, reminder: false };
export const STALE_AFTER_DAYS = 7;

const DAY = 86_400_000;

/** Waiting on a reply: sent, no movement for a while. */
export function isStale(app: Application, now: Date, thresholdDays = STALE_AFTER_DAYS): boolean {
  if (app.archived) return false;
  if (app.stage !== 'applied' && app.stage !== 'screening') return false;
  return daysSince(app.updatedAt, now) >= thresholdDays;
}

export function daysSince(iso: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / DAY));
}

export function applyFilters(apps: readonly Application[], f: Filters, now: Date): Application[] {
  const q = f.q.trim().toLowerCase();
  return apps.filter((a) => {
    if (a.archived) return false;
    if (q && !`${a.company} ${a.role} ${a.location} ${a.notes}`.toLowerCase().includes(q)) return false;
    if (f.stale && !isStale(a, now)) return false;
    if (f.remote && !a.location.toLowerCase().includes('remote')) return false;
    if (f.reminder && !a.reminders.some((r) => !r.done)) return false;
    return true;
  });
}

type ParamReader = { get(name: string): string | null };

/** Filters live in the URL so a filtered view is a shareable link. */
export function parseFilters(params: ParamReader): Filters {
  return {
    q: params.get('q') ?? '',
    stale: params.get('stale') === '1',
    remote: params.get('remote') === '1',
    reminder: params.get('reminder') === '1',
  };
}

export function filtersToSearch(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.stale) p.set('stale', '1');
  if (f.remote) p.set('remote', '1');
  if (f.reminder) p.set('reminder', '1');
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const hasActiveFilters = (f: Filters) => Boolean(f.q.trim() || f.stale || f.remote || f.reminder);
