import { IndexeddbPersistence } from 'y-indexeddb';
import { WebsocketProvider } from 'y-websocket';
import type { Workspace } from '../doc';
import { BroadcastSync } from './broadcast';

export type SyncStatus = 'loading' | 'saved' | 'connecting' | 'syncing' | 'synced' | 'offline';

export interface SyncOptions {
  room: string;
  /** Optional y-websocket server, e.g. ws://localhost:1234. Without it, data stays on this browser. */
  serverUrl?: string;
  onStatus: (status: SyncStatus, lastSyncedAt: number | null) => void;
}

export interface SyncHandle {
  whenReady: Promise<void>;
  destroy: () => void;
}

/**
 * Layers, from closest to the user outward:
 *   IndexedDB       survives reloads and works offline
 *   BroadcastChannel  live sync between tabs
 *   WebSocket       optional sync between devices
 */
export function connectSync(ws: Workspace, opts: SyncOptions): SyncHandle {
  const name = `pipeline:${opts.room}`;
  const persistence = new IndexeddbPersistence(name, ws.doc);
  const tabs = new BroadcastSync(ws.doc, name);

  let ready = false;
  let provider: WebsocketProvider | null = null;
  let connected = false;
  let synced = false;
  let lastSyncedAt: number | null = null;

  const emit = () => {
    if (!ready) return opts.onStatus('loading', lastSyncedAt);
    if (typeof navigator !== 'undefined' && !navigator.onLine) return opts.onStatus('offline', lastSyncedAt);
    if (!provider) return opts.onStatus('saved', lastSyncedAt);
    if (!connected) return opts.onStatus(lastSyncedAt ? 'offline' : 'connecting', lastSyncedAt);
    return opts.onStatus(synced ? 'synced' : 'syncing', lastSyncedAt);
  };

  if (opts.serverUrl) {
    provider = new WebsocketProvider(opts.serverUrl, name, ws.doc);
    provider.on('status', (e: { status: string }) => {
      connected = e.status === 'connected';
      if (!connected) synced = false;
      emit();
    });
    provider.on('sync', (isSynced: boolean) => {
      synced = isSynced;
      if (isSynced) lastSyncedAt = Date.now();
      emit();
    });
    ws.doc.on('update', (_u: Uint8Array, origin: unknown) => {
      if (origin !== provider && connected && synced) {
        lastSyncedAt = Date.now();
        emit();
      }
    });
  }

  const onNet = () => emit();
  window.addEventListener('online', onNet);
  window.addEventListener('offline', onNet);

  const whenReady = persistence.whenSynced.then(() => {
    ready = true;
    emit();
  });
  emit();

  return {
    whenReady,
    destroy() {
      window.removeEventListener('online', onNet);
      window.removeEventListener('offline', onNet);
      tabs.destroy();
      provider?.destroy();
      void persistence.destroy();
    },
  };
}
