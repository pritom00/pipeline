'use client';

import { useMemo } from 'react';
import { useApplications, useWorkspace } from '@/hooks/useWorkspace';
import { useUi } from '@/store/ui';
import { PanelSkeleton } from './Skeletons';

const fmtDay = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export function RemindersView() {
  const apps = useApplications();
  const { ws, ready } = useWorkspace();
  const open = useUi((s) => s.open);
  const today = new Date().toISOString().slice(0, 10);

  const rows = useMemo(
    () =>
      apps
        .filter((a) => !a.archived)
        .flatMap((a) => a.reminders.filter((r) => !r.done).map((r) => ({ app: a, r })))
        .sort((x, y) => (x.r.dueAt < y.r.dueAt ? -1 : 1)),
    [apps],
  );

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-semibold">Reminders</h1>
        <p className="mt-1 text-sm text-muted">Follow-ups you set on your applications, soonest first.</p>
      </div>
      {!ready ? (
        <PanelSkeleton />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-lane p-8 text-sm text-muted">
          You are all caught up. Open an application and add a reminder to follow up when you have not heard back.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map(({ app, r }) => {
            const overdue = r.dueAt < today;
            return (
              <li key={r.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-1 shadow-[inset_0_1px_0_var(--edge)]">
                <input
                  type="checkbox"
                  id={`rem-${r.id}`}
                  checked={r.done}
                  onChange={(e) => ws?.setReminderDone(app.id, r.id, e.target.checked)}
                  className="size-[18px]"
                  style={{ accentColor: '#5252cc' }}
                />
                <label htmlFor={`rem-${r.id}`} className="flex min-h-12 flex-1 cursor-pointer flex-col justify-center text-sm">
                  <span>{r.text}</span>
                </label>
                <button type="button" onClick={() => open(app.id)} className="min-h-11 text-sm font-medium text-accent-text hover:underline">{app.company}</button>
                <span className={`font-mono text-xs ${overdue ? 'font-medium text-danger' : 'text-muted'}`}>{overdue ? 'Overdue · ' : ''}{fmtDay(r.dueAt)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
