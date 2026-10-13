import { create } from 'zustand';
import type { SyncStatus } from '@/lib/sync';

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: number | null;
  room: string;
  serverUrl: string | null;
  set: (patch: Partial<Omit<SyncState, 'set'>>) => void;
}

export const useSync = create<SyncState>((set) => ({
  status: 'loading',
  lastSyncedAt: null,
  room: '',
  serverUrl: null,
  set: (patch) => set(patch),
}));
