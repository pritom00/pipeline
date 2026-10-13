import { describe, expect, it } from 'vitest';
import { computeInsights, median, weekStart } from './stats';
import { app, daysAgo, NOW } from './testing';
import type { StageId, TimelineEvent } from './types';

const ev = (stage: StageId, days: number, i = 0): TimelineEvent => ({
  id: `e${stage}${days}${i}`,
  type: 'stage_changed',
  at: daysAgo(days),
  stage,
});

describe('median', () => {
  it('handles odd, even and empty lists', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe('weekStart', () => {
  it('returns the Monday of the week, in UTC', () => {
    expect(weekStart(new Date('2026-10-13T09:00:00Z')).toISOString()).toBe('2026-10-12T00:00:00.000Z'); // Tuesday
    expect(weekStart(new Date('2026-10-18T23:59:00Z')).toISOString()).toBe('2026-10-12T00:00:00.000Z'); // Sunday
    expect(weekStart(new Date('2026-10-12T00:00:00Z')).toISOString()).toBe('2026-10-12T00:00:00.000Z'); // Monday
  });
});

describe('computeInsights', () => {
  const apps = [
    app({ id: '1', stage: 'wishlist', events: [ev('wishlist', 2)] }),
    app({ id: '2', stage: 'applied', events: [ev('applied', 9)] }),
    app({ id: '3', stage: 'screening', events: [ev('applied', 20), ev('screening', 14)] }),
    app({ id: '4', stage: 'interview', events: [ev('applied', 30), ev('screening', 24), ev('interview', 10)] }),
    app({ id: '5', stage: 'offer', events: [ev('applied', 40), ev('screening', 36), ev('interview', 25), ev('offer', 5)] }),
    app({ id: '6', stage: 'rejected', events: [ev('applied', 30), ev('rejected', 20)] }),
  ];
  const r = computeInsights(apps, NOW);

  it('counts only applications that were actually sent', () => {
    expect(r.applied).toBe(5);
  });

  it('builds a funnel from the furthest stage each application reached', () => {
    expect(r.funnel.map((f) => f.count)).toEqual([5, 3, 2, 1]);
  });

  it('computes response and interview rates', () => {
    // replied: #3, #4, #5, #6 (rejection counts as a reply) out of 5 sent
    expect(r.responseRate).toBeCloseTo(4 / 5);
    expect(r.interviewRate).toBeCloseTo(2 / 5);
  });

  it('computes median days to first reply', () => {
    // #3: 6d, #4: 6d, #5: 4d, #6: 10d  -> sorted 4,6,6,10 -> median 6
    expect(r.medianDaysToReply).toBe(6);
  });

  it('buckets applications into the last 8 weeks', () => {
    expect(r.weekly).toHaveLength(8);
    expect(r.weekly.reduce((n, w) => n + w.count, 0)).toBe(5);
    expect(r.weekly.at(-1)!.start).toBe('2026-10-12');
  });

  it('returns zeros and nulls for an empty workspace', () => {
    const empty = computeInsights([], NOW);
    expect(empty.applied).toBe(0);
    expect(empty.responseRate).toBe(0);
    expect(empty.medianDaysToReply).toBeNull();
    expect(empty.funnel.every((f) => f.count === 0)).toBe(true);
  });

  it('treats a card created directly in screening as an instant reply', () => {
    const direct = computeInsights([app({ id: 'x', stage: 'screening', events: [ev('screening', 3)] })], NOW);
    expect(direct.applied).toBe(1);
    expect(direct.medianDaysToReply).toBe(0);
  });
});
