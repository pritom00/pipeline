'use client';

import { useWorkspace } from '@/hooks/useWorkspace';
import { sampleApplications } from '@/lib/sample';
import { useToasts } from '@/store/toast';
import { useUi } from '@/store/ui';
import { Plus } from './icons';

export function EmptyState() {
  const openNew = useUi((s) => s.openNew);
  const { ws } = useWorkspace();
  const push = useToasts((s) => s.push);
  return (
    <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-4 rounded-2xl border border-dashed border-line bg-lane p-10 text-center">
      <h2 className="text-lg font-semibold">Track your first application</h2>
      <p className="text-sm text-muted">
        Add a role you are interested in, then drag it across the board as it moves from Wishlist to Offer. Everything stays on this device.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => openNew()} className="bevel-btn flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-medium">
          <Plus width={16} height={16} /> Add application
        </button>
        {ws && (
          <button
            type="button"
            onClick={() => {
              sampleApplications().forEach((a) => ws.upsert(a));
              push({ message: 'Sample applications added', actionLabel: 'Undo', onAction: ws.undo });
            }}
            className="min-h-11 rounded-lg border border-line bg-chip px-4 text-sm"
          >
            Load sample applications
          </button>
        )}
      </div>
    </div>
  );
}
