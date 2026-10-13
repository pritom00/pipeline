import * as Y from 'yjs';
import { Workspace } from './doc';
import type { Application } from './types';

export const NOW = new Date('2026-10-13T09:00:00.000Z');
export const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

export function makeWorkspace() {
  return new Workspace(new Y.Doc(), () => NOW);
}

/** A second replica that starts from the same state, as a second device would. */
export function cloneWorkspace(ws: Workspace) {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(ws.doc));
  return new Workspace(doc, () => NOW);
}

/** Exchange everything each side has not seen yet, like reconnecting. */
export function sync(a: Workspace, b: Workspace) {
  const toB = Y.encodeStateAsUpdate(a.doc, Y.encodeStateVector(b.doc));
  const toA = Y.encodeStateAsUpdate(b.doc, Y.encodeStateVector(a.doc));
  Y.applyUpdate(b.doc, toB);
  Y.applyUpdate(a.doc, toA);
}

export function app(partial: Partial<Application> & Pick<Application, 'id'>): Application {
  return {
    company: 'Acme',
    role: 'Engineer',
    url: '',
    stage: 'applied',
    position: 'a0',
    salary: '',
    location: '',
    source: '',
    notes: '',
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
    archived: false,
    events: [],
    contacts: [],
    reminders: [],
    ...partial,
  };
}
