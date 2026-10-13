'use client';

import { useEffect } from 'react';
import { useUi } from '@/store/ui';
import { useWorkspace } from './useWorkspace';

/** ⌘K / Ctrl+K palette, N new, / search, ⌘Z / ⇧⌘Z undo and redo. Letter keys are ignored while typing or in a dialog. */
export function useShortcuts() {
  const { ws } = useWorkspace();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const s = useUi.getState();
        s.setPalette(!s.paletteOpen);
        return;
      }
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));
      if (typing || document.querySelector('[aria-modal="true"]')) return;

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) ws?.redo();
        else ws?.undo();
      } else if (!mod && !e.altKey && e.key === 'n') {
        e.preventDefault();
        useUi.getState().openNew();
      } else if (!mod && e.key === '/') {
        const el = document.getElementById('search');
        if (el) {
          e.preventDefault();
          el.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ws]);
}
