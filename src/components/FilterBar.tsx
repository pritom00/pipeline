'use client';

import { useEffect, useRef, useState } from 'react';
import { useFilters } from '@/hooks/useFilters';
import { hasActiveFilters, NO_FILTERS, type Filters } from '@/lib/filters';
import { Search } from './icons';

const TOGGLES: { key: keyof Pick<Filters, 'stale' | 'remote' | 'reminder'>; label: string }[] = [
  { key: 'stale', label: 'Needs follow-up' },
  { key: 'remote', label: 'Remote' },
  { key: 'reminder', label: 'Has reminder' },
];

export function FilterBar({ shown, total }: { shown: number; total: number }) {
  const { filters, setFilters } = useFilters();
  const [q, setQ] = useState(filters.q);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pushed = useRef(filters.q);

  // Follow the URL when it changes elsewhere (palette, back button, shared link).
  // Skip our own updates, or a slow URL change would overwrite characters typed since.
  useEffect(() => {
    if (filters.q !== pushed.current) setQ(filters.q);
    pushed.current = filters.q;
  }, [filters.q]);

  const onChange = (value: string) => {
    setQ(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      pushed.current = value;
      setFilters({ q: value });
    }, 200);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-52 flex-1 sm:max-w-xs">
        <label htmlFor="search" className="sr-only">Search applications</label>
        <Search width={16} height={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          id="search"
          type="search"
          value={q}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search company, role, place"
          className="min-h-11 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm"
        />
      </div>
      {TOGGLES.map((t) => (
        <button
          key={t.key}
          type="button"
          aria-pressed={filters[t.key]}
          onClick={() => setFilters({ [t.key]: !filters[t.key] })}
          className={`min-h-11 rounded-full border px-4 text-sm ${filters[t.key] ? 'border-accent-text bg-accent-soft font-medium text-accent-text' : 'border-line bg-chip text-muted'}`}
        >
          {t.label}
        </button>
      ))}
      {hasActiveFilters(filters) && (
        <>
          <span className="text-sm text-muted" aria-live="polite">{shown} of {total} shown</span>
          <button type="button" className="min-h-11 px-2 text-sm font-medium text-accent-text" onClick={() => { clearTimeout(timer.current); pushed.current = ''; setQ(''); setFilters(NO_FILTERS); }}>
            Clear filters
          </button>
        </>
      )}
    </div>
  );
}
