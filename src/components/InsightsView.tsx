'use client';

import { useMemo } from 'react';
import { useNow } from '@/hooks/useNow';
import { useApplications, useWorkspace } from '@/hooks/useWorkspace';
import { computeInsights } from '@/lib/stats';
import { stageById } from '@/lib/types';
import { PanelSkeleton } from './Skeletons';

const pct = (n: number) => `${Math.round(n * 100)}%`;
const week = (start: string) => new Date(`${start}T12:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function InsightsView() {
  const apps = useApplications();
  const { ready } = useWorkspace();
  const now = useNow();
  const data = useMemo(() => computeInsights(apps, now), [apps, now]);
  const top = Math.max(1, data.funnel[0]?.count ?? 1);
  const maxWeek = Math.max(1, ...data.weekly.map((w) => w.count));

  const tiles = [
    { label: 'Applications sent', value: String(data.applied) },
    { label: 'Response rate', value: pct(data.responseRate) },
    { label: 'Interview rate', value: pct(data.interviewRate) },
    { label: 'Median days to reply', value: data.medianDaysToReply === null ? '–' : String(data.medianDaysToReply) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-semibold">Insights</h1>
        <p className="mt-1 text-sm text-muted">Worked out from each application’s timeline, on this device.</p>
      </div>

      {!ready ? (
        <PanelSkeleton />
      ) : data.applied === 0 ? (
        <div className="max-w-md rounded-2xl border border-dashed border-line bg-lane p-8 text-sm text-muted">
          Nothing to chart yet. Once an application moves to Applied or beyond, its funnel, reply times and weekly activity show up here.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            <section aria-labelledby="funnel-h" className="flex min-w-0 flex-[2_1_420px] flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
              <h2 id="funnel-h" className="text-[15px] font-semibold">Funnel</h2>
              <ul className="flex flex-col gap-4">
                {data.funnel.map((f, i) => (
                  <li key={f.stage} className="flex items-center gap-3">
                    <span className="w-[90px] shrink-0 text-sm text-muted">{stageById(f.stage).name}</span>
                    <div className="h-7 min-w-0 flex-1 rounded-md bg-chip">
                      <div
                        className="extrude animate-growx h-full rounded-md"
                        style={{ width: `${Math.round((f.count / top) * 100)}%`, background: stageById(f.stage).color, animationDelay: `${i * 120}ms` }}
                        role="img"
                        aria-label={`${f.count} of ${top} applications reached ${stageById(f.stage).name}`}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right font-mono font-medium">{f.count}</span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="grid min-w-0 flex-[1_1_280px] grid-cols-2 content-start gap-4">
              {tiles.map((t) => (
                <div key={t.label} className="lift flex flex-col gap-1.5 rounded-2xl border border-line bg-surface p-4 shadow-[inset_0_1px_0_var(--edge),0_12px_20px_-10px_var(--shadow)]">
                  <span className="text-[13px] text-muted">{t.label}</span>
                  <span className="font-mono text-[26px] font-medium">{t.value}</span>
                </div>
              ))}
            </div>
          </div>

          <section aria-labelledby="weekly-h" className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
            <h2 id="weekly-h" className="text-[15px] font-semibold">Applications per week</h2>
            <div className="flex h-40 items-end gap-3 border-b border-line">
              {data.weekly.map((w, i) => (
                <div key={w.start} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="font-mono text-xs text-muted">{w.count}</span>
                  <div
                    className="extrude animate-growy w-full max-w-12 rounded-t-md bg-accent"
                    style={{ height: `${(w.count / maxWeek) * 120}px`, animationDelay: `${i * 70}ms` }}
                    role="img"
                    aria-label={`${w.count} applications in the week of ${week(w.start)}`}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              {data.weekly.map((w) => (
                <span key={w.start} className="min-w-0 flex-1 text-center text-xs text-muted">{week(w.start)}</span>
              ))}
            </div>
          </section>

          <p className="max-w-prose text-xs text-muted">
            A reply means the application reached Screening or later, or was rejected. Days to reply is the time between the first move to Applied and that reply.
          </p>
        </>
      )}
    </div>
  );
}
