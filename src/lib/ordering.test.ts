import { describe, expect, it } from 'vitest';
import { isStrictlyOrdered, positionAt, positionAtEnd, rebalance, sortByPosition } from './ordering';

const item = (id: string, position: string) => ({ id, position });

describe('ordering', () => {
  it('inserts between two neighbours without touching them', () => {
    const list = [item('a', 'a0'), item('b', 'a1')];
    const key = positionAt(list, 1);
    expect(key > 'a0' && key < 'a1').toBe(true);
  });

  it('inserts at the start and at the end', () => {
    const list = [item('a', 'a0'), item('b', 'a1')];
    expect(positionAt(list, 0) < 'a0').toBe(true);
    expect(positionAtEnd(list) > 'a1').toBe(true);
  });

  it('works on an empty column', () => {
    expect(typeof positionAt([], 0)).toBe('string');
  });

  it('clamps an out-of-range index', () => {
    const list = [item('a', 'a0')];
    expect(positionAt(list, 99) > 'a0').toBe(true);
    expect(positionAt(list, -5) < 'a0').toBe(true);
  });

  it('breaks ties on id so every device sorts the same way', () => {
    const sorted = sortByPosition([item('b', 'a0'), item('a', 'a0'), item('c', 'Zz')]);
    expect(sorted.map((i) => i.id)).toEqual(['c', 'a', 'b']);
  });

  it('detects duplicate positions', () => {
    expect(isStrictlyOrdered([item('a', 'a0'), item('b', 'a1')])).toBe(true);
    expect(isStrictlyOrdered([item('a', 'a0'), item('b', 'a0')])).toBe(false);
  });

  it('rebalance returns strictly increasing keys', () => {
    const keys = rebalance(25);
    expect(keys).toHaveLength(25);
    expect(isStrictlyOrdered(keys.map((k, i) => item(String(i), k)))).toBe(true);
  });

  it('survives many inserts at the same spot', () => {
    let list = [item('a', 'a0'), item('z', 'a1')];
    for (let i = 0; i < 200; i++) {
      list = [list[0]!, item(`n${i}`, positionAt(list, 1)), ...list.slice(1)];
    }
    expect(isStrictlyOrdered(list)).toBe(true);
  });
});
