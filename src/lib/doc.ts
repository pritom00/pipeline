import * as Y from 'yjs';
import { newId } from './id';
import { isStrictlyOrdered, positionAt, positionAtEnd, rebalance, sortByPosition } from './ordering';
import {
  EDITABLE_FIELDS,
  type Application,
  type ApplicationInput,
  type ApplicationPatch,
  type Contact,
  type Reminder,
  type StageId,
  type TimelineEvent,
} from './types';

/** Transaction origin for edits made on this device. Only these are undoable. */
export const LOCAL = 'local';

type AppMap = Y.Map<unknown>;

function toApplication(m: AppMap): Application {
  const list = <T,>(key: string): T[] => ((m.get(key) as Y.Array<T> | undefined)?.toArray() ?? []) as T[];
  const str = (key: string) => (m.get(key) as string | undefined) ?? '';
  return {
    id: str('id'),
    company: str('company'),
    role: str('role'),
    url: str('url'),
    stage: (m.get('stage') as StageId | undefined) ?? 'wishlist',
    position: str('position'),
    salary: str('salary'),
    location: str('location'),
    source: str('source'),
    notes: str('notes'),
    createdAt: str('createdAt'),
    updatedAt: str('updatedAt'),
    archived: Boolean(m.get('archived')),
    events: list<TimelineEvent>('events'),
    contacts: list<Contact>('contacts'),
    reminders: list<Reminder>('reminders'),
  };
}

/**
 * The workspace is a Yjs document. Each application is a Y.Map, so two people
 * editing different fields of the same card merge without losing either edit.
 * The UI never touches Yjs: it reads plain objects through subscribe/getSnapshot.
 */
export class Workspace {
  readonly doc: Y.Doc;
  readonly undoManager: Y.UndoManager;
  private readonly apps: Y.Map<AppMap>;
  private cache: Application[] | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(doc: Y.Doc = new Y.Doc(), private readonly now: () => Date = () => new Date()) {
    this.doc = doc;
    this.apps = doc.getMap<AppMap>('applications');
    this.undoManager = new Y.UndoManager(this.apps, {
      trackedOrigins: new Set([LOCAL]),
      captureTimeout: 400,
    });
    doc.on('update', () => {
      this.cache = null;
      this.listeners.forEach((l) => l());
    });
  }

  // ---- reading (React: useSyncExternalStore(subscribe, getSnapshot)) ----

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Stable reference until the document changes. */
  getSnapshot = (): Application[] => {
    if (!this.cache) this.cache = this.readAll();
    return this.cache;
  };

  private readAll(): Application[] {
    return Array.from(this.apps.values()).map(toApplication);
  }

  private iso(): string {
    return this.now().toISOString();
  }

  private activeIn(stage: StageId, excludeId?: string): Application[] {
    return sortByPosition(
      this.readAll().filter((a) => a.stage === stage && !a.archived && a.id !== excludeId),
    );
  }

  // ---- writing ----

  add(input: ApplicationInput): string {
    this.undoManager.stopCapturing();
    const id = newId();
    const at = this.iso();
    const stage = input.stage ?? 'wishlist';
    const position = positionAtEnd(this.activeIn(stage));
    this.doc.transact(() => {
      this.apps.set(id, this.build({
        id,
        company: input.company,
        role: input.role,
        url: input.url ?? '',
        stage,
        position,
        salary: input.salary ?? '',
        location: input.location ?? '',
        source: input.source ?? '',
        notes: input.notes ?? '',
        createdAt: at,
        updatedAt: at,
        archived: false,
        events: [{ id: newId(), type: 'stage_changed', at, stage }],
        contacts: [],
        reminders: [],
      }));
    }, LOCAL);
    return id;
  }

  /** Insert or replace a whole application. Used by import and sample data. */
  upsert(app: Application): void {
    this.doc.transact(() => {
      this.apps.set(app.id, this.build(app));
    }, LOCAL);
  }

  private build(app: Application): AppMap {
    const m: AppMap = new Y.Map();
    const { events, contacts, reminders, ...scalars } = app;
    for (const [k, v] of Object.entries(scalars)) m.set(k, v);
    const mk = <T,>(items: T[]) => {
      const arr = new Y.Array<T>();
      if (items.length) arr.push(items);
      return arr;
    };
    m.set('events', mk(events));
    m.set('contacts', mk(contacts));
    m.set('reminders', mk(reminders));
    return m;
  }

  update(id: string, patch: ApplicationPatch): void {
    const m = this.apps.get(id);
    if (!m) return;
    this.doc.transact(() => {
      for (const key of EDITABLE_FIELDS) {
        const value = patch[key];
        if (value !== undefined && m.get(key) !== value) m.set(key, value);
      }
      m.set('updatedAt', this.iso());
    }, LOCAL);
  }

  /**
   * Move a card to `index` within `stage`. Writes one fractional position, so
   * only the moved card changes. If concurrent edits left duplicate positions,
   * the column is rebalanced first inside the same transaction.
   */
  move(id: string, stage: StageId, index: number): void {
    const m = this.apps.get(id);
    if (!m) return;
    this.undoManager.stopCapturing();
    this.doc.transact(() => {
      let siblings = this.activeIn(stage, id);
      if (!isStrictlyOrdered(siblings)) {
        const keys = rebalance(siblings.length);
        siblings.forEach((s, i) => this.apps.get(s.id)?.set('position', keys[i]));
        siblings = this.activeIn(stage, id);
      }
      m.set('position', positionAt(siblings, index));
      if (m.get('stage') !== stage) {
        m.set('stage', stage);
        (m.get('events') as Y.Array<TimelineEvent>).push([
          { id: newId(), type: 'stage_changed', at: this.iso(), stage },
        ]);
      }
      m.set('updatedAt', this.iso());
    }, LOCAL);
  }

  setArchived(id: string, archived: boolean): void {
    const m = this.apps.get(id);
    if (!m) return;
    this.undoManager.stopCapturing();
    this.doc.transact(() => {
      m.set('archived', archived);
      m.set('updatedAt', this.iso());
    }, LOCAL);
  }

  remove(id: string): void {
    this.undoManager.stopCapturing();
    this.doc.transact(() => {
      this.apps.delete(id);
    }, LOCAL);
  }

  addNote(id: string, text: string): void {
    this.pushTo(id, 'events', { id: newId(), type: 'note', at: this.iso(), text } satisfies TimelineEvent);
  }

  addContact(id: string, contact: Omit<Contact, 'id'>): void {
    this.pushTo(id, 'contacts', { id: newId(), ...contact });
  }

  addReminder(id: string, reminder: Pick<Reminder, 'text' | 'dueAt'>): void {
    this.pushTo(id, 'reminders', { id: newId(), done: false, ...reminder });
  }

  setReminderDone(id: string, reminderId: string, done: boolean): void {
    const m = this.apps.get(id);
    const arr = m?.get('reminders') as Y.Array<Reminder> | undefined;
    if (!m || !arr) return;
    const index = arr.toArray().findIndex((r) => r.id === reminderId);
    if (index < 0) return;
    const current = arr.get(index);
    this.doc.transact(() => {
      arr.delete(index, 1);
      arr.insert(index, [{ ...current, done }]);
      m.set('updatedAt', this.iso());
    }, LOCAL);
  }

  private pushTo<T>(id: string, key: 'events' | 'contacts' | 'reminders', item: T): void {
    const m = this.apps.get(id);
    const arr = m?.get(key) as Y.Array<T> | undefined;
    if (!m || !arr) return;
    this.doc.transact(() => {
      arr.push([item]);
      m.set('updatedAt', this.iso());
    }, LOCAL);
  }

  // ---- history ----

  undo = () => void this.undoManager.undo();
  redo = () => void this.undoManager.redo();
  get canUndo() {
    return this.undoManager.canUndo();
  }
  get canRedo() {
    return this.undoManager.canRedo();
  }
}
