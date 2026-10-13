'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useDialog } from '@/hooks/useFocusTrap';
import { useTheme } from '@/hooks/useTheme';
import { useApplications, useWorkspace } from '@/hooks/useWorkspace';
import { downloadText } from '@/lib/download';
import { rankBy } from '@/lib/fuzzy';
import { buildExport, toCsv } from '@/lib/transfer';
import { STAGES, stageById } from '@/lib/types';
import { useToasts } from '@/store/toast';
import { useUi } from '@/store/ui';
import { Search } from './icons';

interface Item {
  id: string;
  label: string;
  group: 'Commands' | 'Applications';
  hint?: string;
  key?: string;
  run: () => void;
}
interface Result {
  item: Item;
  indexes: number[];
}

function Highlight({ text, indexes }: { text: string; indexes: number[] }) {
  if (!indexes.length) return <>{text}</>;
  const hit = new Set(indexes);
  const out: ReactNode[] = [];
  [...text].forEach((ch, i) =>
    out.push(hit.has(i) ? <span key={i} className="font-semibold text-accent-text">{ch}</span> : ch),
  );
  return <>{out}</>;
}

export function CommandPalette() {
  const ref = useRef<HTMLDivElement>(null);
  const setPalette = useUi((s) => s.setPalette);
  const close = () => setPalette(false);
  useDialog(ref, close);

  const router = useRouter();
  const apps = useApplications();
  const { ws } = useWorkspace();
  const [theme, toggleTheme] = useTheme();
  const { selectedId, open, openNew } = useUi();
  const push = useToasts((s) => s.push);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);

  const active = useMemo(() => apps.filter((a) => !a.archived), [apps]);

  const commands = useMemo<Item[]>(() => {
    const day = new Date().toISOString().slice(0, 10);
    const list: Item[] = [];
    const selected = active.find((a) => a.id === selectedId);
    if (selected && ws) {
      for (const s of STAGES.filter((x) => x.id !== selected.stage)) {
        list.push({
          id: `move-${s.id}`,
          label: `Move to ${s.name}`,
          group: 'Commands',
          hint: selected.company,
          run: () => {
            ws.move(selected.id, s.id, Number.MAX_SAFE_INTEGER);
            push({ message: `Moved ${selected.company} to ${s.name}`, actionLabel: 'Undo', onAction: ws.undo });
          },
        });
      }
      list.push({
        id: 'archive',
        label: 'Archive application',
        group: 'Commands',
        hint: selected.company,
        run: () => {
          ws.setArchived(selected.id, true);
          open(null);
          push({ message: `Archived ${selected.company}`, actionLabel: 'Undo', onAction: ws.undo });
        },
      });
    }
    list.push(
      { id: 'new', label: 'New application', group: 'Commands', key: 'N', run: () => openNew() },
      { id: 'board', label: 'Go to Board', group: 'Commands', run: () => router.push('/') },
      { id: 'insights', label: 'Go to Insights', group: 'Commands', run: () => router.push('/insights') },
      { id: 'reminders', label: 'Go to Reminders', group: 'Commands', run: () => router.push('/reminders') },
      { id: 'stale', label: 'Show applications that need a follow-up', group: 'Commands', run: () => router.push('/?stale=1') },
      { id: 'clear', label: 'Clear filters', group: 'Commands', run: () => router.push('/') },
      { id: 'theme', label: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme', group: 'Commands', run: toggleTheme },
      { id: 'undo', label: 'Undo', group: 'Commands', key: '⌘Z', run: () => ws?.undo() },
      { id: 'redo', label: 'Redo', group: 'Commands', key: '⇧⌘Z', run: () => ws?.redo() },
      { id: 'export-json', label: 'Export data as JSON', group: 'Commands', run: () => downloadText(`pipeline-${day}.json`, JSON.stringify(buildExport(apps), null, 2)) },
      { id: 'export-csv', label: 'Export data as CSV', group: 'Commands', run: () => downloadText(`pipeline-${day}.csv`, toCsv(apps), 'text/csv') },
      { id: 'import', label: 'Import data from JSON', group: 'Commands', run: () => document.getElementById('import-input')?.click() },
    );
    return list;
  }, [active, apps, selectedId, ws, router, theme, toggleTheme, open, openNew, push]);

  const appItems = useMemo<Item[]>(
    () =>
      [...active]
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
        .map((a) => ({
          id: `app-${a.id}`,
          label: `${a.company} · ${a.role}`,
          group: 'Applications' as const,
          hint: stageById(a.stage).name,
          run: () => open(a.id),
        })),
    [active, open],
  );

  const results = useMemo<Result[]>(() => {
    const q = query.trim();
    if (!q) return [...commands.slice(0, 8), ...appItems.slice(0, 5)].map((item) => ({ item, indexes: [] }));
    const c = rankBy(commands, q, (i) => i.label).slice(0, 8);
    const a = rankBy(appItems, q, (i) => i.label).slice(0, 6);
    return [...c, ...a].map((r) => ({ item: r.item, indexes: r.match.indexes }));
  }, [query, commands, appItems]);

  useEffect(() => setCursor(0), [query]);
  useEffect(() => {
    document.getElementById(`opt-${cursor}`)?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const run = (r: Result | undefined) => {
    if (!r) return;
    close();
    r.item.run();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setCursor(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setCursor(results.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(results[cursor]);
    }
  };

  let lastGroup = '';
  return (
    <div className="fixed inset-0 z-[55] flex items-start justify-center bg-black/55 p-4 pt-[12vh] backdrop-blur" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Command palette" className="animate-pop flex max-h-[70vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[inset_0_1px_0_var(--edge),0_60px_90px_-30px_var(--shadow),0_0_60px_-20px_#5252cc]">
        <div className="flex items-center gap-3 border-b border-line px-5">
          <Search width={20} height={20} className="text-muted" />
          <label htmlFor="palette-input" className="sr-only">Search commands and applications</label>
          <input
            id="palette-input"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={results.length ? `opt-${cursor}` : undefined}
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Type a command or a company"
            className="min-h-14 flex-1 bg-transparent text-[17px] outline-none"
          />
          <span className="rounded border border-line px-1.5 py-0.5 font-mono text-xs text-muted">esc</span>
        </div>

        <div id="palette-list" role="listbox" aria-label="Results" className="flex-1 overflow-y-auto p-2.5">
          {results.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">Nothing matches “{query}”. Try a company name or a command like “insights”.</p>}
          {results.map((r, i) => {
            const header = r.item.group !== lastGroup ? r.item.group : null;
            lastGroup = r.item.group;
            return (
              <div key={r.item.id}>
                {header && <div className="px-3 pb-1 pt-2.5 text-sm font-medium text-muted">{header}</div>}
                <div
                  id={`opt-${i}`}
                  role="option"
                  aria-selected={i === cursor}
                  onMouseMove={() => setCursor(i)}
                  onClick={() => run(r)}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 text-[15px] ${i === cursor ? 'bg-accent-soft shadow-[inset_0_1px_0_var(--edge)]' : ''}`}
                >
                  <span className="flex-1 truncate"><Highlight text={r.item.label} indexes={r.indexes} /></span>
                  {r.item.hint && <span className="text-xs text-muted">{r.item.hint}</span>}
                  {r.item.key && <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-xs text-muted">{r.item.key}</kbd>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex min-h-11 items-center gap-4 border-t border-line bg-glass px-5 text-xs text-muted">
          <span><span className="font-mono">↑↓</span> move</span>
          <span><span className="font-mono">↵</span> run</span>
          <span className="flex-1" />
          <span>Works offline</span>
        </div>
      </div>
    </div>
  );
}
