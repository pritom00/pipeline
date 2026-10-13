import * as Y from 'yjs';
import { afterEach, describe, expect, it } from 'vitest';
import { Workspace } from '../doc';
import { BroadcastSync } from './broadcast';

const wait = (ms = 60) => new Promise((r) => setTimeout(r, ms));
const open: BroadcastSync[] = [];
const tab = (room: string) => {
  const ws = new Workspace(new Y.Doc());
  const bc = new BroadcastSync(ws.doc, room);
  open.push(bc);
  return ws;
};

afterEach(() => {
  open.splice(0).forEach((b) => b.destroy());
});

describe('BroadcastSync (two tabs)', () => {
  it('shows an edit from one tab in the other', async () => {
    const a = tab('room-1');
    const b = tab('room-1');
    a.add({ company: 'Acme', role: 'Engineer' });
    await wait();
    expect(b.getSnapshot().map((x) => x.company)).toEqual(['Acme']);
  });

  it('catches a new tab up with existing data', async () => {
    const a = tab('room-2');
    a.add({ company: 'Early', role: 'r' });
    const late = tab('room-2');
    await wait();
    expect(late.getSnapshot().map((x) => x.company)).toEqual(['Early']);
  });

  it('merges edits made while the tabs were not talking', async () => {
    const a = tab('room-3');
    const id = a.add({ company: 'Acme', role: 'r' });
    const b = tab('room-3');
    await wait();

    open.forEach((x) => x.destroy()); // simulate going offline
    a.update(id, { salary: '$120k' });
    b.update(id, { location: 'Remote' });

    open.push(new BroadcastSync(a.doc, 'room-3'), new BroadcastSync(b.doc, 'room-3')); // reconnect
    await wait();

    for (const ws of [a, b]) {
      const x = ws.getSnapshot()[0]!;
      expect(x.salary).toBe('$120k');
      expect(x.location).toBe('Remote');
    }
  });

  it('keeps rooms separate', async () => {
    const a = tab('room-4');
    const other = tab('room-5');
    a.add({ company: 'Private', role: 'r' });
    await wait();
    expect(other.getSnapshot()).toHaveLength(0);
  });
});
