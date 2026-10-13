'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import { useDialog } from '@/hooks/useFocusTrap';
import { useNow } from '@/hooks/useNow';
import { useApplications, useWorkspace } from '@/hooks/useWorkspace';
import type { Workspace } from '@/lib/doc';
import { daysSince } from '@/lib/filters';
import {
  applicationFormSchema,
  contactFormSchema,
  reminderFormSchema,
  type ApplicationFormValues,
  type ContactFormValues,
  type ReminderFormValues,
} from '@/lib/schema';
import { STAGES, stageById, type Application, type StageId } from '@/lib/types';
import { useToasts } from '@/store/toast';
import { useUi } from '@/store/ui';
import { ApplicationFields, Field, inputClass } from './ApplicationFields';
import { Close, Link as LinkIcon } from './icons';

const TABS = [
  ['details', 'Details'],
  ['timeline', 'Timeline'],
  ['contacts', 'Contacts'],
  ['reminders', 'Reminders'],
] as const;
type Tab = (typeof TABS)[number][0];

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const fmtDay = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const toValues = (a: Application): ApplicationFormValues => ({
  company: a.company, role: a.role, stage: a.stage, url: a.url, salary: a.salary, location: a.location, source: a.source, notes: a.notes,
});

export function CardDrawer() {
  const id = useUi((s) => s.selectedId);
  const open = useUi((s) => s.open);
  const apps = useApplications();
  const { ws } = useWorkspace();
  const app = apps.find((a) => a.id === id);
  const ref = useRef<HTMLElement>(null);
  const close = () => open(null);
  useDialog(ref, close);

  // The card can disappear underneath us: deleted here and undone, or removed on another device.
  useEffect(() => {
    if (!app) open(null);
  }, [app, open]);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[3px]" onClick={close} aria-hidden="true" />
      <aside
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="animate-drawer absolute inset-y-0 right-0 flex w-full flex-col border-l border-line bg-surface shadow-[-40px_0_80px_-20px_var(--shadow),inset_1px_0_0_var(--edge)] sm:w-[520px]"
      >
        {app && ws && <DrawerBody key={app.id} app={app} ws={ws} onClose={close} />}
      </aside>
    </div>
  );
}

function DrawerBody({ app, ws, onClose }: { app: Application; ws: Workspace; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('details');
  const now = useNow();
  const push = useToasts((s) => s.push);
  const stage = stageById(app.stage);

  const onTabKey = (e: KeyboardEvent) => {
    const i = TABS.findIndex((t) => t[0] === tab);
    const next = e.key === 'ArrowRight' ? (i + 1) % TABS.length : e.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length : -1;
    if (next < 0) return;
    e.preventDefault();
    const target = TABS[next]![0];
    setTab(target);
    requestAnimationFrame(() => document.getElementById(`tab-${target}`)?.focus());
  };

  const moveStage = (to: StageId) => {
    if (to === app.stage) return;
    ws.move(app.id, to, Number.MAX_SAFE_INTEGER);
    push({ message: `Moved ${app.company} to ${stageById(to).name}`, actionLabel: 'Undo', onAction: ws.undo });
  };

  return (
    <>
      <div className="border-b border-line px-6 pb-4 pt-5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 id="drawer-title" className="truncate text-[22px] font-semibold">{app.company}</h2>
            <p className="truncate text-muted">{app.role}</p>
          </div>
          <button type="button" aria-label="Close details" onClick={onClose} className="-mr-2.5 -mt-1.5 flex size-11 items-center justify-center rounded-lg text-muted hover:text-ink">
            <Close />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="relative">
            <label htmlFor="drawer-stage" className="sr-only">Stage</label>
            <span className="pointer-events-none absolute left-3.5 top-1/2 size-2.5 -translate-y-1/2 rounded-full" style={{ background: stage.color }} aria-hidden="true" />
            <select id="drawer-stage" value={app.stage} onChange={(e) => moveStage(e.target.value as StageId)} className="min-h-11 rounded-full border border-line bg-chip pl-8 pr-4 text-sm font-medium shadow-[inset_0_1px_0_var(--edge)]">
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <span className="font-mono text-xs text-muted">Last activity {daysSince(app.updatedAt, now)}d ago</span>
          {app.url && (
            <a href={app.url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-1.5 text-sm font-medium text-accent-text hover:underline">
              <LinkIcon width={15} height={15} /> Open posting
            </a>
          )}
        </div>
      </div>

      <div role="tablist" aria-label="Application sections" onKeyDown={onTabKey} className="flex gap-1 border-b border-line px-4">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            id={`tab-${key}`}
            type="button"
            role="tab"
            aria-selected={tab === key}
            aria-controls={`panel-${key}`}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}
            className={`min-h-11 border-b-2 px-3.5 text-sm ${tab === key ? 'border-accent-text font-medium text-accent-text' : 'border-transparent text-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="flex-1 overflow-y-auto px-6 py-5">
        {tab === 'details' && <DetailsTab app={app} ws={ws} onClose={onClose} />}
        {tab === 'timeline' && <TimelineTab app={app} ws={ws} />}
        {tab === 'contacts' && <ContactsTab app={app} ws={ws} />}
        {tab === 'reminders' && <RemindersTab app={app} ws={ws} />}
      </div>
    </>
  );
}

function DetailsTab({ app, ws, onClose }: { app: Application; ws: Workspace; onClose: () => void }) {
  const push = useToasts((s) => s.push);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ApplicationFormValues>({ resolver: zodResolver(applicationFormSchema), defaultValues: toValues(app) });

  // Pick up edits from another tab or device, but never overwrite what is being typed.
  useEffect(() => {
    if (!isDirty) reset(toValues(app));
  }, [app, isDirty, reset]);

  const save = (v: ApplicationFormValues) => {
    ws.update(app.id, { company: v.company, role: v.role, url: v.url, salary: v.salary, location: v.location, source: v.source, notes: v.notes });
    reset(v);
    push({ message: 'Saved' });
  };

  return (
    <form onSubmit={handleSubmit(save)} noValidate className="flex flex-col gap-6">
      <ApplicationFields idPrefix="edit" register={register} errors={errors} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={!isDirty} className="bevel-btn min-h-11 rounded-lg px-5 text-sm font-medium disabled:opacity-50">Save changes</button>
        <div className="flex-1" />
        <button
          type="button"
          className="min-h-11 rounded-lg px-3 text-sm text-muted hover:text-ink"
          onClick={() => {
            ws.setArchived(app.id, true);
            push({ message: `Archived ${app.company}`, actionLabel: 'Undo', onAction: ws.undo });
            onClose();
          }}
        >
          Archive
        </button>
        <button
          type="button"
          className="min-h-11 rounded-lg px-3 text-sm text-danger"
          onClick={() => {
            ws.remove(app.id);
            push({ message: `Deleted ${app.company}`, actionLabel: 'Undo', onAction: ws.undo });
            onClose();
          }}
        >
          Delete
        </button>
      </div>
    </form>
  );
}

function TimelineTab({ app, ws }: { app: Application; ws: Workspace }) {
  const [text, setText] = useState('');
  const events = [...app.events].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  const oldestId = events[events.length - 1]?.id;
  return (
    <div className="flex flex-col gap-6">
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          ws.addNote(app.id, text.trim());
          setText('');
        }}
      >
        <label htmlFor="note" className="text-sm font-medium">Add a note</label>
        <textarea id="note" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Recruiter call went well, follow up Friday" className={`${inputClass} py-2`} />
        <button type="submit" disabled={!text.trim()} className="bevel-btn min-h-11 self-start rounded-lg px-4 text-sm font-medium disabled:opacity-50">Add note</button>
      </form>

      <ol className="flex flex-col">
        {events.map((e, i) => {
          const color = e.type === 'stage_changed' && e.stage ? stageById(e.stage).color : 'var(--muted)';
          const label =
            e.type === 'note' ? e.text : e.id === oldestId ? `Added to ${stageById(e.stage!).name}` : `Moved to ${stageById(e.stage!).name}`;
          return (
            <li key={e.id} className="flex gap-3.5">
              <div className="flex w-3 flex-col items-center">
                <span className="mt-1 size-3 rounded-full" style={{ background: color, boxShadow: `0 0 14px -2px ${color}` }} />
                {i < events.length - 1 && <span className="min-h-7 w-0.5 flex-1 bg-line" />}
              </div>
              <div className="flex flex-1 justify-between gap-3 pb-4">
                <span className={e.type === 'note' ? 'whitespace-pre-wrap text-sm' : 'text-sm font-medium'}>{label}</span>
                <span className="whitespace-nowrap font-mono text-xs text-muted">{fmt(e.at)}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ContactsTab({ app, ws }: { app: Application; ws: Workspace }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({ resolver: zodResolver(contactFormSchema), defaultValues: { name: '', role: '', email: '' } });
  return (
    <div className="flex flex-col gap-6">
      {app.contacts.length === 0 ? (
        <p className="text-sm text-muted">No contacts yet. Add the recruiter or hiring manager so you can find them later.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {app.contacts.map((c) => (
            <li key={c.id} className="flex flex-col rounded-xl border border-line bg-bg px-4 py-3">
              <span className="font-medium">{c.name}</span>
              {c.role && <span className="text-sm text-muted">{c.role}</span>}
              {c.email && <a href={`mailto:${c.email}`} className="text-sm text-accent-text hover:underline">{c.email}</a>}
            </li>
          ))}
        </ul>
      )}
      <form
        noValidate
        onSubmit={handleSubmit((v) => {
          ws.addContact(app.id, v);
          reset();
        })}
        className="flex flex-col gap-4 border-t border-line pt-5"
      >
        <Field id="c-name" label="Name" error={errors.name?.message}>
          <input id="c-name" {...register('name')} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'c-name-err' : undefined} className={inputClass} />
        </Field>
        <Field id="c-role" label="Role" error={errors.role?.message}>
          <input id="c-role" {...register('role')} placeholder="Recruiter" className={inputClass} />
        </Field>
        <Field id="c-email" label="Email" error={errors.email?.message}>
          <input id="c-email" type="email" {...register('email')} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'c-email-err' : undefined} className={inputClass} />
        </Field>
        <button type="submit" className="bevel-btn min-h-11 self-start rounded-lg px-4 text-sm font-medium">Add contact</button>
      </form>
    </div>
  );
}

function RemindersTab({ app, ws }: { app: Application; ws: Workspace }) {
  const inThreeDays = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReminderFormValues>({ resolver: zodResolver(reminderFormSchema), defaultValues: { text: '', dueAt: inThreeDays } });
  const sorted = [...app.reminders].sort((a, b) => (a.dueAt < b.dueAt ? -1 : 1));
  return (
    <div className="flex flex-col gap-6">
      {sorted.length === 0 ? (
        <p className="text-sm text-muted">No reminders. Set one to follow up if you hear nothing.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {sorted.map((r) => (
            <li key={r.id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1">
                <input type="checkbox" checked={r.done} onChange={(e) => ws.setReminderDone(app.id, r.id, e.target.checked)} className="size-[18px]" style={{ accentColor: '#5252cc' }} />
                <span className={`flex-1 text-sm ${r.done ? 'text-muted line-through' : ''}`}>{r.text}</span>
                <span className={`font-mono text-xs ${!r.done && r.dueAt < today ? 'font-medium text-danger' : 'text-muted'}`}>
                  {!r.done && r.dueAt < today ? 'Overdue · ' : ''}{fmtDay(r.dueAt)}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <form
        noValidate
        onSubmit={handleSubmit((v) => {
          ws.addReminder(app.id, v);
          reset({ text: '', dueAt: inThreeDays });
        })}
        className="flex flex-col gap-4 border-t border-line pt-5"
      >
        <Field id="r-text" label="Follow up on" error={errors.text?.message}>
          <input id="r-text" {...register('text')} aria-invalid={Boolean(errors.text)} aria-describedby={errors.text ? 'r-text-err' : undefined} placeholder="Ask about next steps" className={inputClass} />
        </Field>
        <Field id="r-due" label="Date" error={errors.dueAt?.message}>
          <input id="r-due" type="date" {...register('dueAt')} className={inputClass} />
        </Field>
        <button type="submit" className="bevel-btn min-h-11 self-start rounded-lg px-4 text-sm font-medium">Add reminder</button>
      </form>
    </div>
  );
}
