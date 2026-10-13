'use client';

import { useToasts } from '@/store/toast';

export function Toasts() {
  const { toasts, dismiss } = useToasts();
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
      {toasts.map((t) => (
        <div key={t.id} className="animate-pop pointer-events-auto flex min-h-11 max-w-md items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2 text-sm shadow-[0_20px_40px_-12px_var(--shadow)]">
          <span className="flex-1">{t.message}</span>
          {t.actionLabel && (
            <button
              type="button"
              className="min-h-11 rounded-md px-2 font-medium text-accent-text"
              onClick={() => {
                t.onAction?.();
                dismiss(t.id);
              }}
            >
              {t.actionLabel}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
