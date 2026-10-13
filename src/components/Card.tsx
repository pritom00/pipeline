'use client';

import { memo, type CSSProperties, type PointerEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { STAGES, stageById, type Application, type StageId } from '@/lib/types';
import { Clock, Dots, Grip } from './icons';

interface BodyProps {
  app: Application;
  age: number;
  stale: boolean;
  onOpen?: () => void;
  onMove?: (stage: StageId) => void;
  handle?: { ref: (el: HTMLElement | null) => void; props: Record<string, unknown> };
  floating?: boolean;
}

/** Tilts toward the pointer. Writes CSS variables directly, so moving the mouse never re-renders React. */
function tilt(e: PointerEvent<HTMLElement>) {
  if (e.pointerType !== 'mouse') return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width - 0.5;
  const py = (e.clientY - r.top) / r.height - 0.5;
  el.style.setProperty('--rx', `${(-py * 14).toFixed(1)}deg`);
  el.style.setProperty('--ry', `${(px * 14).toFixed(1)}deg`);
  el.dataset.tilt = 'true';
}
function untilt(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  el.style.removeProperty('--rx');
  el.style.removeProperty('--ry');
  delete el.dataset.tilt;
}

export function CardBody({ app, age, stale, onOpen, onMove, handle, floating }: BodyProps) {
  const stage = stageById(app.stage);
  return (
    <article
      aria-label={`${app.company}, ${app.role}`}
      onPointerMove={floating ? undefined : tilt}
      onPointerLeave={floating ? undefined : untilt}
      className={`card3d flex flex-col gap-2.5 rounded-xl p-3.5 ${floating ? 'card-floating' : ''}`}
      style={{ '--stage': stage.color } as CSSProperties}
    >
      <div className="flex items-start gap-1.5">
        {handle && (
          <button
            type="button"
            ref={handle.ref}
            {...handle.props}
            aria-label={`Reorder ${app.company}`}
            className="-ml-1.5 -mt-1 flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted active:cursor-grabbing"
          >
            <Grip width={16} height={16} />
          </button>
        )}
        <div className="min-w-0 flex-1 pt-0.5">
          <button type="button" onClick={onOpen} className="block max-w-full truncate text-left text-[15px] font-semibold hover:underline">
            {app.company}
          </button>
          <div className="truncate text-[13px] text-muted">{app.role}</div>
        </div>
        <span className="pt-0.5 font-mono text-xs text-muted" title="Days since last activity">{age}d</span>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {app.location && <span className="rounded-full bg-chip px-2 py-0.5 text-xs text-muted">{app.location}</span>}
          {app.salary && <span className="rounded-full bg-chip px-2 py-0.5 font-mono text-xs text-muted">{app.salary}</span>}
        </div>
        {onMove && (
          <label className="relative -mb-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-muted focus-within:outline focus-within:outline-2 focus-within:outline-accent-text">
            <Dots width={18} height={18} />
            <select
              aria-label={`Move ${app.company} to another stage`}
              value={app.stage}
              onChange={(e) => onMove(e.target.value as StageId)}
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {stale && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-warn">
          <Clock width={14} height={14} /> No reply in {age} days
        </div>
      )}
    </article>
  );
}

interface SortableProps {
  app: Application;
  age: number;
  stale: boolean;
  onOpen: (id: string) => void;
  onMove: (id: string, stage: StageId) => void;
}

export const SortableCard = memo(function SortableCard({ app, age, stale, onOpen, onMove }: SortableProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: app.id });
  // Pointer and touch start a drag from anywhere on the card. The keyboard starts one from the handle.
  const { onKeyDown, ...pointer } = (listeners ?? {}) as Record<string, unknown> & { onKeyDown?: unknown };
  return (
    <div
      ref={setNodeRef}
      {...pointer}
      style={{ transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
    >
      <CardBody
        app={app}
        age={age}
        stale={stale}
        onOpen={() => onOpen(app.id)}
        onMove={(s) => onMove(app.id, s)}
        handle={{ ref: setActivatorNodeRef, props: { ...attributes, onKeyDown } }}
      />
    </div>
  );
});
