'use client';

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Workspace } from '@/lib/doc';
import { getRoom } from '@/lib/room';
import type { Application } from '@/lib/types';
import { useSync } from '@/store/sync';

interface Ctx {
  ws: Workspace | null;
  ready: boolean;
}
export const WorkspaceContext = createContext<Ctx>({ ws: null, ready: false });

const EMPTY: Application[] = [];
const noopSubscribe = () => () => {};
const getEmpty = () => EMPTY;

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Ctx>({ ws: null, ready: false });

  useEffect(() => {
    let cancelled = false;
    let destroy = () => {};
    const ws = new Workspace();
    const room = getRoom();
    const serverUrl = process.env.NEXT_PUBLIC_SYNC_URL || null;
    useSync.getState().set({ room, serverUrl });

    // Loaded on the client only: these libraries touch browser APIs.
    import('@/lib/sync').then(({ connectSync }) => {
      if (cancelled) return;
      const handle = connectSync(ws, {
        room,
        serverUrl: serverUrl ?? undefined,
        onStatus: (status, lastSyncedAt) => useSync.getState().set({ status, lastSyncedAt }),
      });
      destroy = handle.destroy;
      setState({ ws, ready: false });
      handle.whenReady.then(() => {
        if (!cancelled) setState({ ws, ready: true });
      });
    });

    return () => {
      cancelled = true;
      destroy();
    };
  }, []);

  return <WorkspaceContext.Provider value={state}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

/** All applications, re-rendering only when the document changes. */
export function useApplications(): Application[] {
  const { ws } = useWorkspace();
  return useSyncExternalStore(ws ? ws.subscribe : noopSubscribe, ws ? ws.getSnapshot : getEmpty, getEmpty);
}
