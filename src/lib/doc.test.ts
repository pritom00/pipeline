import { describe, expect, it } from 'vitest';
import { cloneWorkspace, makeWorkspace, sync } from './testing';

const ids = (ws: ReturnType<typeof makeWorkspace>, stage: string) =>
  ws
    .getSnapshot()
    .filter((a) => a.stage === stage)
    .sort((x, y) => (x.position < y.position ? -1 : x.position > y.position ? 1 : x.id < y.id ? -1 : 1))
    .map((a) => a.company);

describe('Workspace', () => {
  it('adds an application with a first timeline event', () => {
    const ws = makeWorkspace();
    const id = ws.add({ company: 'Acme', role: 'Engineer', stage: 'applied' });
    const [a] = ws.getSnapshot();
    expect(a?.id).toBe(id);
    expect(a?.events).toHaveLength(1);
    expect(a?.events[0]?.stage).toBe('applied');
  });

  it('keeps a stable snapshot reference until something changes', () => {
    const ws = makeWorkspace();
    ws.add({ company: 'Acme', role: 'Engineer' });
    const first = ws.getSnapshot();
    expect(ws.getSnapshot()).toBe(first);
    ws.add({ company: 'Beta', role: 'Engineer' });
    expect(ws.getSnapshot()).not.toBe(first);
  });

  it('notifies subscribers on change', () => {
    const ws = makeWorkspace();
    let calls = 0;
    const off = ws.subscribe(() => calls++);
    ws.add({ company: 'Acme', role: 'Engineer' });
    off();
    ws.add({ company: 'Beta', role: 'Engineer' });
    expect(calls).toBe(1);
  });

  it('appends new cards to the end of their column', () => {
    const ws = makeWorkspace();
    ws.add({ company: 'A', role: 'r', stage: 'applied' });
    ws.add({ company: 'B', role: 'r', stage: 'applied' });
    ws.add({ company: 'C', role: 'r', stage: 'applied' });
    expect(ids(ws, 'applied')).toEqual(['A', 'B', 'C']);
  });

  it('reorders inside a column by changing only the moved card', () => {
    const ws = makeWorkspace();
    const a = ws.add({ company: 'A', role: 'r', stage: 'applied' });
    ws.add({ company: 'B', role: 'r', stage: 'applied' });
    ws.add({ company: 'C', role: 'r', stage: 'applied' });
    const before = ws.getSnapshot();
    ws.move(a, 'applied', 2); // A to the end of [B, C]
    const after = ws.getSnapshot();
    expect(ids(ws, 'applied')).toEqual(['B', 'C', 'A']);
    for (const name of ['B', 'C']) {
      const x = before.find((v) => v.company === name)!;
      const y = after.find((v) => v.company === name)!;
      expect(y.position).toBe(x.position);
    }
  });

  it('moves between columns and records a stage change', () => {
    const ws = makeWorkspace();
    const a = ws.add({ company: 'A', role: 'r', stage: 'applied' });
    ws.add({ company: 'X', role: 'r', stage: 'interview' });
    ws.move(a, 'interview', 0);
    const moved = ws.getSnapshot().find((v) => v.id === a)!;
    expect(moved.stage).toBe('interview');
    expect(moved.events.at(-1)?.stage).toBe('interview');
    expect(ids(ws, 'interview')).toEqual(['A', 'X']);
  });

  it('undoes and redoes a move as one step', () => {
    const ws = makeWorkspace();
    const a = ws.add({ company: 'A', role: 'r', stage: 'applied' });
    ws.undoManager.stopCapturing();
    ws.move(a, 'offer', 0);
    expect(ws.getSnapshot()[0]?.stage).toBe('offer');
    ws.undo();
    const undone = ws.getSnapshot()[0]!;
    expect(undone.stage).toBe('applied');
    expect(undone.events).toHaveLength(1);
    ws.redo();
    expect(ws.getSnapshot()[0]?.stage).toBe('offer');
  });

  it('archives instead of deleting, and ignores archived cards when ordering', () => {
    const ws = makeWorkspace();
    const a = ws.add({ company: 'A', role: 'r', stage: 'applied' });
    ws.setArchived(a, true);
    expect(ws.getSnapshot()[0]?.archived).toBe(true);
  });

  it('restores a deleted application, with its history, on undo', () => {
    const ws = makeWorkspace();
    const a = ws.add({ company: 'Acme', role: 'r', stage: 'applied' });
    ws.addNote(a, 'kept');
    ws.undoManager.stopCapturing();
    ws.remove(a);
    expect(ws.getSnapshot()).toHaveLength(0);
    ws.undo();
    const back = ws.getSnapshot()[0]!;
    expect(back.company).toBe('Acme');
    expect(back.events.map((e) => e.type)).toEqual(['stage_changed', 'note']);
  });

  it('undoes archive', () => {
    const ws = makeWorkspace();
    const a = ws.add({ company: 'Acme', role: 'r' });
    ws.setArchived(a, true);
    ws.undo();
    expect(ws.getSnapshot()[0]?.archived).toBe(false);
  });

  it('toggles a reminder', () => {
    const ws = makeWorkspace();
    const a = ws.add({ company: 'A', role: 'r' });
    ws.addReminder(a, { text: 'Follow up', dueAt: '2026-10-20' });
    const rid = ws.getSnapshot()[0]!.reminders[0]!.id;
    ws.setReminderDone(a, rid, true);
    expect(ws.getSnapshot()[0]!.reminders[0]!.done).toBe(true);
  });
});

describe('offline merge (two devices)', () => {
  it('merges edits to different fields of the same card', () => {
    const phone = makeWorkspace();
    const id = phone.add({ company: 'Acme', role: 'Engineer', stage: 'applied' });
    const laptop = cloneWorkspace(phone);

    phone.update(id, { salary: '$120k' });
    laptop.update(id, { location: 'Remote' });
    sync(phone, laptop);

    for (const ws of [phone, laptop]) {
      const a = ws.getSnapshot()[0]!;
      expect(a.salary).toBe('$120k');
      expect(a.location).toBe('Remote');
    }
  });

  it('keeps cards added on both sides', () => {
    const phone = makeWorkspace();
    const laptop = cloneWorkspace(phone);
    phone.add({ company: 'FromPhone', role: 'r' });
    laptop.add({ company: 'FromLaptop', role: 'r' });
    sync(phone, laptop);
    expect(phone.getSnapshot().map((a) => a.company).sort()).toEqual(['FromLaptop', 'FromPhone']);
    expect(laptop.getSnapshot().map((a) => a.company).sort()).toEqual(['FromLaptop', 'FromPhone']);
  });

  it('keeps notes added on both sides to the same card', () => {
    const phone = makeWorkspace();
    const id = phone.add({ company: 'Acme', role: 'r' });
    const laptop = cloneWorkspace(phone);
    phone.addNote(id, 'phone note');
    laptop.addNote(id, 'laptop note');
    sync(phone, laptop);
    const texts = (ws: typeof phone) =>
      ws.getSnapshot()[0]!.events.filter((e) => e.type === 'note').map((e) => e.text).sort();
    expect(texts(phone)).toEqual(['laptop note', 'phone note']);
    expect(texts(laptop)).toEqual(texts(phone));
  });

  it('converges when both devices move the same card', () => {
    const phone = makeWorkspace();
    const id = phone.add({ company: 'Acme', role: 'r', stage: 'applied' });
    const laptop = cloneWorkspace(phone);
    phone.move(id, 'screening', 0);
    laptop.move(id, 'interview', 0);
    sync(phone, laptop);
    expect(phone.getSnapshot()[0]!.stage).toBe(laptop.getSnapshot()[0]!.stage);
    expect(phone.getSnapshot()[0]!.position).toBe(laptop.getSnapshot()[0]!.position);
  });

  it('survives two cards landing in the same empty slot, then repairs the column', () => {
    const phone = makeWorkspace();
    const x = phone.add({ company: 'X', role: 'r', stage: 'applied' });
    const y = phone.add({ company: 'Y', role: 'r', stage: 'applied' });
    const z = phone.add({ company: 'Z', role: 'r', stage: 'applied' });
    const laptop = cloneWorkspace(phone);

    phone.move(x, 'offer', 0);
    laptop.move(y, 'offer', 0);
    sync(phone, laptop);

    const offer = phone.getSnapshot().filter((a) => a.stage === 'offer');
    expect(offer).toHaveLength(2);
    expect(offer[0]!.position).toBe(offer[1]!.position); // the collision is real

    // Both devices agree on the order even before repair.
    expect(ids(phone, 'offer')).toEqual(ids(laptop, 'offer'));

    // The next move into that column does not throw and leaves a clean order.
    expect(() => phone.move(z, 'offer', 1)).not.toThrow();
    const repaired = phone.getSnapshot().filter((a) => a.stage === 'offer');
    const positions = repaired.map((a) => a.position);
    expect(new Set(positions).size).toBe(3);
  });

  it('does not undo the other device\'s edits', () => {
    const phone = makeWorkspace();
    const id = phone.add({ company: 'Acme', role: 'r' });
    phone.undoManager.stopCapturing();
    const laptop = cloneWorkspace(phone);
    laptop.update(id, { salary: '$150k' });
    phone.update(id, { location: 'Remote' });
    sync(phone, laptop);
    phone.undo(); // undoes only the phone's location edit
    const a = phone.getSnapshot()[0]!;
    expect(a.salary).toBe('$150k');
    expect(a.location).toBe('');
  });
});
