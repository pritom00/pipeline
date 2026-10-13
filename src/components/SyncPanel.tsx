'use client';

import { useRef, useState } from 'react';
import { useApplications, useWorkspace } from '@/hooks/useWorkspace';
import { useDialog } from '@/hooks/useFocusTrap';
import { downloadText } from '@/lib/download';
import { setRoom } from '@/lib/room';
import { sampleApplications } from '@/lib/sample';
import { buildExport, toCsv } from '@/lib/transfer';
import { useSync } from '@/store/sync';
import { useToasts } from '@/store/toast';
import { useUi } from '@/store/ui';
import { Download, Upload } from './icons';
import { STATUS_LABEL } from './SyncPill';

const EXPLAIN = {
  loading: 'Opening your saved data.',
  saved: 'Everything is saved in this browser and shared live between your open tabs.',
  connecting: 'Reaching the sync server. You can keep working.',
  syncing: 'Sending and receiving changes.',
  synced: 'All changes are shared with the sync server.',
  offline: 'You are offline. Edits are saved on this device and merge when you reconnect.',
} as const;

function ago(ts: number | null) {
  if (!ts) return null;
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s} seconds ago`;
  return `${Math.round(s / 60)} min ago`;
}

export function SyncPanel() {
  const ref = useRef<HTMLDivElement>(null);
  const setSync = useUi((s) => s.setSync);
  useDialog(ref, () => setSync(false));
  const { status, lastSyncedAt, room, serverUrl } = useSync();
  const { ws } = useWorkspace();
  const apps = useApplications();
  const push = useToasts((s) => s.push);
  const [join, setJoin] = useState('');
  const [joinError, setJoinError] = useState('');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(room);
      push({ message: 'Room key copied' });
    } catch {
      push({ message: 'Could not copy. Select the key and copy it by hand.' });
    }
  };

  const day = new Date().toISOString().slice(0, 10);
  const last = ago(lastSyncedAt);

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={() => setSync(false)} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-label="Sync and data"
        className="animate-pop absolute right-0 top-14 z-40 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-5 rounded-2xl border border-line bg-surface p-5 shadow-[inset_0_1px_0_var(--edge),0_40px_70px_-24px_var(--shadow)]"
      >
        <div>
          <h2 className="text-base font-semibold">{STATUS_LABEL[status]}</h2>
          <p className="mt-1 text-sm text-muted">{EXPLAIN[status]}</p>
          {last && serverUrl && <p className="mt-1 text-xs text-muted">Last synced {last}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="room-key" className="text-sm font-medium">Room key</label>
          <div className="flex gap-2">
            <input id="room-key" readOnly value={room} className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 font-mono text-sm" />
            <button type="button" onClick={copy} className="bevel-btn min-h-11 rounded-lg px-4 text-sm font-medium">Copy</button>
          </div>
          <p className="text-xs text-muted">Anyone with this key who reaches your sync server can join and edit. There are no accounts.</p>
        </div>

        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!setRoom(join)) return setJoinError('Use 4 to 64 letters, numbers or dashes.');
            location.reload();
          }}
        >
          <label htmlFor="join-room" className="text-sm font-medium">Join another room</label>
          <div className="flex gap-2">
            <input id="join-room" value={join} onChange={(e) => { setJoin(e.target.value); setJoinError(''); }} placeholder="abcd-efgh-jkmn" aria-invalid={Boolean(joinError)} aria-describedby={joinError ? 'join-err' : undefined} className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 font-mono text-sm" />
            <button type="submit" className="min-h-11 rounded-lg border border-line bg-chip px-4 text-sm">Join</button>
          </div>
          {joinError && <p id="join-err" className="text-xs text-danger">{joinError}</p>}
        </form>

        <p className="text-xs text-muted">
          {serverUrl ? <>Sync server: <span className="font-mono">{serverUrl}</span></> : 'No sync server is set. To sync between devices, run one and set NEXT_PUBLIC_SYNC_URL (see the README).'}
        </p>

        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <span className="text-sm font-medium">Your data</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="flex min-h-11 items-center gap-2 rounded-lg border border-line bg-chip px-3 text-sm" onClick={() => downloadText(`pipeline-${day}.json`, JSON.stringify(buildExport(apps), null, 2))}>
              <Download width={16} height={16} /> Export JSON
            </button>
            <button type="button" className="flex min-h-11 items-center gap-2 rounded-lg border border-line bg-chip px-3 text-sm" onClick={() => downloadText(`pipeline-${day}.csv`, toCsv(apps), 'text/csv')}>
              <Download width={16} height={16} /> Export CSV
            </button>
            <button type="button" className="flex min-h-11 items-center gap-2 rounded-lg border border-line bg-chip px-3 text-sm" onClick={() => document.getElementById('import-input')?.click()}>
              <Upload width={16} height={16} /> Import JSON
            </button>
          </div>
          {apps.length === 0 && ws && (
            <button type="button" className="min-h-11 self-start rounded-lg px-1 text-sm font-medium text-accent-text" onClick={() => { sampleApplications().forEach((a) => ws.upsert(a)); push({ message: 'Sample applications added' }); setSync(false); }}>
              Load sample applications
            </button>
          )}
        </div>
      </div>
    </>
  );
}
