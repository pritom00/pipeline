import type { Application, StageId } from './types';

export const COLUMN_PREFIX = 'col:';

export interface DropInput {
  /** Every active card, sorted, by stage (not just the ones passing the filters). */
  full: Record<StageId, Application[]>;
  moving: Application;
  /** The id of whatever the card was dropped on: a card id, or `col:<stage>`. */
  overId: string;
  /** Top edge of the dragged card, and top and height of the target card. Used when crossing columns. */
  activeTop?: number;
  overTop: number;
  overHeight: number;
}

/**
 * Turns a drop into a destination `{ stage, index }`, or null when nothing would change.
 * `index` is where the card ends up among that stage's other cards.
 */
export function resolveDrop(i: DropInput): { stage: StageId; index: number } | null {
  const { full, moving, overId } = i;

  if (overId.startsWith(COLUMN_PREFIX)) {
    const stage = overId.slice(COLUMN_PREFIX.length) as StageId;
    if (!full[stage]) return null;
    const index = full[stage].filter((c) => c.id !== moving.id).length; // dropped on the column itself: go to the end
    return stage === moving.stage && full[stage].findIndex((c) => c.id === moving.id) === index ? null : { stage, index };
  }

  const target = Object.values(full).flat().find((c) => c.id === overId);
  if (!target) return null;
  const stage = target.stage;
  const list = full[stage];
  const overIndex = list.findIndex((c) => c.id === overId);

  if (stage === moving.stage) {
    // Same column: the card takes the slot of the card it was dropped on.
    return overIndex === list.findIndex((c) => c.id === moving.id) ? null : { stage, index: overIndex };
  }
  // Another column: before the target, or after it when dropped on its lower half.
  const below = i.activeTop !== undefined && i.activeTop > i.overTop + i.overHeight / 2;
  return { stage, index: overIndex + (below ? 1 : 0) };
}
