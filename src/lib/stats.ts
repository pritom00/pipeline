import type { Application, StageId } from './types';

const RANK: Record<StageId, number> = {
  wishlist: 0,
  applied: 1,
  screening: 2,
  interview: 3,
  offer: 4,
  rejected: -1,
};

const DAY = 86_400_000;

/** Furthest forward stage an application ever reached (rejected does not count as progress). */
export function reachedRank(app: Application): number {
  let best = RANK[app.stage];
  for (const e of app.events) {
    if (e.type === 'stage_changed' && e.stage) best = Math.max(best, RANK[e.stage]);
  }
  return best;
}

/** When the application was first sent: the earliest event at stage "applied" or beyond. */
export function firstAppliedAt(app: Application): Date | null {
  const times = app.events
    .filter((e) => e.type === 'stage_changed' && e.stage && RANK[e.stage] >= 1)
    .map((e) => new Date(e.at).getTime());
  return times.length ? new Date(Math.min(...times)) : null;
}

/** First sign of life from the company: screening or later, or a rejection. */
export function firstReplyAt(app: Application): Date | null {
  const applied = firstAppliedAt(app);
  if (!applied) return null;
  const times = app.events
    .filter(
      (e) =>
        e.type === 'stage_changed' &&
        e.stage &&
        (RANK[e.stage] >= 2 || e.stage === 'rejected') &&
        new Date(e.at).getTime() >= applied.getTime(),
    )
    .map((e) => new Date(e.at).getTime());
  return times.length ? new Date(Math.min(...times)) : null;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Monday 00:00 UTC of the week containing `d`. */
export function weekStart(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (x.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(x.getTime() - dow * DAY);
}

export interface Insights {
  applied: number;
  funnel: { stage: StageId; count: number }[];
  responseRate: number; // 0..1
  interviewRate: number; // 0..1
  medianDaysToReply: number | null;
  weekly: { start: string; count: number }[];
}

/** Everything here is derived from the event timeline, so no stats are ever stored. */
export function computeInsights(apps: readonly Application[], now: Date, weeks = 8): Insights {
  const sent = apps.filter((a) => firstAppliedAt(a) !== null);
  const applied = sent.length;

  const funnelStages: StageId[] = ['applied', 'screening', 'interview', 'offer'];
  const funnel = funnelStages.map((stage) => ({
    stage,
    count: sent.filter((a) => reachedRank(a) >= RANK[stage]).length,
  }));

  const replied = sent.filter((a) => firstReplyAt(a) !== null);
  const days = replied.map((a) => {
    const diff = firstReplyAt(a)!.getTime() - firstAppliedAt(a)!.getTime();
    return Math.max(0, Math.round(diff / DAY));
  });

  const thisWeek = weekStart(now).getTime();
  const weekly = Array.from({ length: weeks }, (_, i) => {
    const start = thisWeek - (weeks - 1 - i) * 7 * DAY;
    const count = sent.filter((a) => {
      const t = firstAppliedAt(a)!.getTime();
      return t >= start && t < start + 7 * DAY;
    }).length;
    return { start: new Date(start).toISOString().slice(0, 10), count };
  });

  return {
    applied,
    funnel,
    responseRate: applied ? replied.length / applied : 0,
    interviewRate: applied ? sent.filter((a) => reachedRank(a) >= 3).length / applied : 0,
    medianDaysToReply: median(days),
    weekly,
  };
}
