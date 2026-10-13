'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { THEME_KEY as KEY } from '@/lib/theme';
type Theme = 'light' | 'dark';

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => obs.disconnect();
}

/** The initial class is set by an inline script in <head> to avoid a flash. */
export function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore<Theme>(
    subscribe,
    () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'),
    () => 'dark',
  );
  const toggle = useCallback(() => {
    const next: Theme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem(KEY, next);
    } catch {}
  }, []);
  return [theme, toggle];
}

