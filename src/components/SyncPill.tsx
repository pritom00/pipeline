'use client';

import dynamic from 'next/dynamic';
import { useSync } from '@/store/sync';
import { useUi } from '@/store/ui';
import type { SyncStatus } from '@/lib/sync';

const SyncPanel = dynamic(() => import('./SyncPanel').then((m) => m.SyncPanel), { ssr: false });

export const STATUS_LABEL: Record<SyncStatus, string> = {
  loading: 'Loading',
  saved: 'Saved on this device',
  connecting: 'Connecting',
  syncing: 'Syncing',
  synced: 'Synced',
  offline: 'Offline',
};

const DOT: Record<SyncStatus, string> = {
  loading: 'bg-muted',
  saved: 'bg-ok',
  connecting: 'bg-warn',
  syncing: 'bg-warn',
  synced: 'bg-ok',
  offline: 'bg-muted',
};

export function SyncPill() {
  const status = useSync((s) => s.status);
  const { syncOpen, setSync } = useUi();
  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={syncOpen}
        onClick={() => setSync(!syncOpen)}
        className="flex min-h-11 items-center gap-2 rounded-full border border-line bg-chip px-3 text-[13px] text-ink"
      >
        <span className={`size-2 rounded-full ${DOT[status]} ${status === 'synced' || status === 'saved' ? 'live-dot' : ''}`} />
        <span className="hidden sm:inline">{STATUS_LABEL[status]}</span>
        <span className="sr-only sm:hidden">{STATUS_LABEL[status]}</span>
      </button>
      {syncOpen && <SyncPanel />}
    </div>
  );
}
