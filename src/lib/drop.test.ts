import { describe, expect, it } from 'vitest';
import { resolveDrop } from './drop';
import { app } from './testing';
import { STAGE_IDS, type Application, type StageId } from './types';

const board = (cards: Application[]) => {
  const full = Object.fromEntries(STAGE_IDS.map((s) => [s, [] as Application[]])) as Record<StageId, Application[]>;
  cards.forEach((c) => full[c.stage].push(c));
  return full;
};

const a = app({ id: 'a', stage: 'applied', position: 'a0' });
const b = app({ id: 'b', stage: 'applied', position: 'a1' });
const c = app({ id: 'c', stage: 'applied', position: 'a2' });
const x = app({ id: 'x', stage: 'interview', position: 'a0' });
const y = app({ id: 'y', stage: 'interview', position: 'a1' });
const full = board([a, b, c, x, y]);
const geo = { overTop: 100, overHeight: 80 };

describe('resolveDrop', () => {
  it('reorders within a column to the slot of the card it landed on', () => {
    expect(resolveDrop({ full, moving: a, overId: 'c', ...geo })).toEqual({ stage: 'applied', index: 2 });
    expect(resolveDrop({ full, moving: c, overId: 'a', ...geo })).toEqual({ stage: 'applied', index: 0 });
  });

  it('does nothing when dropped back where it started', () => {
    expect(resolveDrop({ full, moving: b, overId: 'b', ...geo })).toBeNull();
  });

  it('goes before the target when crossing columns from above its midpoint', () => {
    expect(resolveDrop({ full, moving: a, overId: 'x', activeTop: 120, ...geo })).toEqual({ stage: 'interview', index: 0 });
  });

  it('goes after the target when crossing columns below its midpoint', () => {
    expect(resolveDrop({ full, moving: a, overId: 'x', activeTop: 160, ...geo })).toEqual({ stage: 'interview', index: 1 });
    expect(resolveDrop({ full, moving: a, overId: 'y', activeTop: 170, ...geo })).toEqual({ stage: 'interview', index: 2 });
  });

  it('drops on an empty column at index 0', () => {
    expect(resolveDrop({ full, moving: a, overId: 'col:offer', ...geo })).toEqual({ stage: 'offer', index: 0 });
  });

  it('drops on a column header area into the end of that column', () => {
    expect(resolveDrop({ full, moving: a, overId: 'col:interview', ...geo })).toEqual({ stage: 'interview', index: 2 });
  });

  it('dropping on its own column moves to the end, unless already last', () => {
    expect(resolveDrop({ full, moving: a, overId: 'col:applied', ...geo })).toEqual({ stage: 'applied', index: 2 });
    expect(resolveDrop({ full, moving: c, overId: 'col:applied', ...geo })).toBeNull();
  });

  it('ignores unknown targets', () => {
    expect(resolveDrop({ full, moving: a, overId: 'nope', ...geo })).toBeNull();
    expect(resolveDrop({ full, moving: a, overId: 'col:ghosted', ...geo })).toBeNull();
  });
});
