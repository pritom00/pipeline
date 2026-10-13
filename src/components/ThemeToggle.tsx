'use client';

import { useTheme } from '@/hooks/useTheme';
import { Moon, Sun } from './icons';

export function ThemeToggle() {
  const [theme, toggle] = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="flex size-11 items-center justify-center rounded-lg text-muted hover:text-ink"
    >
      {theme === 'dark' ? <Sun /> : <Moon />}
    </button>
  );
}
