'use client';

import { useMemo, useState } from 'react';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useFilters } from '@/hooks/useFilters';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useNow } from '@/hooks/useNow';
import { useApplications, useWorkspace } from '@/hooks/useWorkspace';
import { COLUMN_PREFIX, resolveDrop } from '@/lib/drop';
import { applyFilters, daysSince, isStale } from '@/lib/filters';
import { sortByPosition } from '@/lib/ordering';
import { STAGES, stageById, type Application, type StageId } from '@/lib/types';
import { useToasts } from '@/store/toast';
import { useUi } from '@/store/ui';
import { CardBody, SortableCard } from './Card';
import { EmptyState } from './EmptyState';
import { FilterBar } from './FilterBar';
import { Plus } from './icons';
import { BoardSkeleton } from './Skeletons';

const COL = COLUMN_PREFIX;

interface ColumnProps {
  stage: StageId;
  index: number;
  cards: Application[];
  total: number;
  now: Date;
  highlight: boolean;
  fluid: boolean;
  filtered: boolean;
  onOpen: (id: string) => void;
  onMove: (id: string, stage: StageId) => void;
  onAdd: (stage: StageId) => void;
}

function Column({ stage, index, cards, total, now, highlight, fluid, filtered, onOpen, onMove, onAdd }: ColumnProps) {
  const s = stageById(stage);
  const { setNodeRef } = useDroppable({ id: COL + stage });
  return (
    <section
      aria-label={s.name}
      data-over={highlight}
      className={`lane animate-rise flex flex-col gap-3 rounded-2xl p-3 ${fluid ? 'w-full' : 'w-[280px] shrink-0'}`}
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div className="flex min-h-8 items-center gap-2 px-1">
        <span className="size-2.5 rounded-full" style={{ background: s.color }} aria-hidden="true" />
        <h2 className="text-sm font-semibold">{s.name}</h2>
        <span className="font-mono text-xs text-muted">{filtered ? `${cards.length}/${total}` : total}</span>
        <div className="flex-1" />
        <button type="button" aria-label={`Add application to ${s.name}`} onClick={() => onAdd(stage)} className="-mr-2 flex size-11 items-center justify-center rounded-lg text-muted hover:text-ink">
          <Plus width={16} height={16} />
        </button>
      </div>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-24 flex-col gap-3">
          {cards.map((c) => (
            <SortableCard key={c.id} app={c} age={daysSince(c.updatedAt, now)} stale={isStale(c, now)} onOpen={onOpen} onMove={onMove} />
          ))}
          {cards.length === 0 && (
            <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-line px-3 text-center text-sm text-muted">
              {filtered && total > 0 ? 'No matches in this stage' : 'Drop a card here'}
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

export function Board() {
  const apps = useApplications();
  const { ws, ready } = useWorkspace();
  const now = useNow();
  const { filters } = useFilters();
  const open = useUi((s) => s.open);
  const openNew = useUi((s) => s.openNew);
  const push = useToasts((s) => s.push);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [mobileStage, setMobileStage] = useState<StageId>('applied');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<StageId | null>(null);

  const active = useMemo(() => apps.filter((a) => !a.archived), [apps]);
  const byId = useMemo(() => new Map(active.map((a) => [a.id, a])), [active]);
  const full = useMemo(() => {
    const out = {} as Record<StageId, Application[]>;
    for (const s of STAGES) out[s.id] = sortByPosition(active.filter((a) => a.stage === s.id));
    return out;
  }, [active]);
  const visible = useMemo(() => new Set(applyFilters(active, filters, now).map((a) => a.id)), [active, filters, now]);
  const filtered = visible.size !== active.length || Boolean(filters.q);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const nameOf = (id: string | number) => byId.get(String(id))?.company ?? 'card';
  const placeOf = (id: string | number) => {
    const s = String(id);
    if (s.startsWith(COL)) return `${stageById(s.slice(COL.length) as StageId).name} column`;
    const a = byId.get(s);
    return a ? `${a.company} in ${stageById(a.stage).name}` : 'another card';
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${nameOf(active.id)} is over ${placeOf(over.id)}.` : undefined),
    onDragEnd: ({ active, over }) => (over ? `Dropped ${nameOf(active.id)} on ${placeOf(over.id)}.` : `${nameOf(active.id)} was not moved.`),
    onDragCancel: ({ active }) => `Cancelled. ${nameOf(active.id)} was not moved.`,
  };

  const moveTo = (id: string, stage: StageId, index: number) => {
    const card = byId.get(id);
    if (!ws || !card) return;
    ws.move(id, stage, index);
    if (stage !== card.stage) push({ message: `Moved ${card.company} to ${stageById(stage).name}`, actionLabel: 'Undo', onAction: ws.undo });
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragOver = (e: DragOverEvent) => {
    const id = e.over ? String(e.over.id) : null;
    if (!id) return setOverStage(null);
    setOverStage(id.startsWith(COL) ? (id.slice(COL.length) as StageId) : (byId.get(id)?.stage ?? null));
  };
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    setOverStage(null);
    const { active: a, over } = e;
    if (!over) return;
    const id = String(a.id);
    const moving = byId.get(id);
    if (!moving) return;
    const overId = String(over.id);
    const drop = resolveDrop({
      full,
      moving,
      overId,
      activeTop: a.rect.current.translated?.top,
      overTop: over.rect.top,
      overHeight: over.rect.height,
    });
    if (drop) moveTo(id, drop.stage, drop.index);
  };

  const activeCard = activeId ? byId.get(activeId) : undefined;
  const stages = isMobile ? STAGES.filter((s) => s.id === mobileStage) : STAGES;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-[22px] font-semibold">Job search</h1>
        {ready && active.length > 0 && <span className="text-sm text-muted">{active.length} applications</span>}
      </div>

      {!ready ? (
        <BoardSkeleton />
      ) : active.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <FilterBar shown={visible.size} total={active.length} />

          {isMobile && (
            <div role="tablist" aria-label="Stages" className="-mx-4 flex gap-1 overflow-x-auto px-4">
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={s.id === mobileStage}
                  onClick={() => setMobileStage(s.id)}
                  className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm ${s.id === mobileStage ? 'bg-accent-soft font-medium text-accent-text' : 'text-muted'}`}
                >
                  <span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden="true" />
                  {s.name}
                  <span className="font-mono text-xs">{full[s.id].length}</span>
                </button>
              ))}
            </div>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            accessibility={{
              announcements,
              screenReaderInstructions: {
                draggable: 'To pick up a card, focus its reorder button and press space. Use the arrow keys to move it, space to drop, escape to cancel. You can also use the menu on each card to move it to another stage.',
              },
            }}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDragCancel={() => { setActiveId(null); setOverStage(null); }}
          >
            <div className="-mx-4 flex gap-5 overflow-x-auto px-4 pb-12 pt-4 md:-mx-6 md:px-6" style={{ perspective: 1400 }}>
              {stages.map((s, i) => (
                <Column
                  key={s.id}
                  stage={s.id}
                  index={i}
                  cards={full[s.id].filter((c) => visible.has(c.id))}
                  total={full[s.id].length}
                  now={now}
                  highlight={overStage === s.id && activeCard?.stage !== s.id}
                  fluid={isMobile}
                  filtered={filtered}
                  onOpen={open}
                  onMove={(id, stage) => moveTo(id, stage, Number.MAX_SAFE_INTEGER)}
                  onAdd={openNew}
                />
              ))}
            </div>
            <DragOverlay dropAnimation={{ duration: 220 }}>
              {activeCard ? <CardBody app={activeCard} age={daysSince(activeCard.updatedAt, now)} stale={isStale(activeCard, now)} floating /> : null}
            </DragOverlay>
          </DndContext>
        </>
      )}
    </div>
  );
}
