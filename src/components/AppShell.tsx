'use client';

import dynamic from 'next/dynamic';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import type { ChangeEvent, ReactNode } from 'react';
import { useShortcuts } from '@/hooks/useShortcuts';
import { useWorkspace } from '@/hooks/useWorkspace';
import { importInto, parseImport } from '@/lib/transfer';
import { useToasts } from '@/store/toast';
import { useUi } from '@/store/ui';
import { Bell, Board, Chart, Logo, Plus, Search } from './icons';
import { SyncPill } from './SyncPill';
import { ThemeToggle } from './ThemeToggle';
import { Toasts } from './Toasts';

const CardDrawer = dynamic(() => import('./CardDrawer').then((m) => m.CardDrawer), { ssr: false });
const CommandPalette = dynamic(() => import('./CommandPalette').then((m) => m.CommandPalette), { ssr: false });
const NewApplicationDialog = dynamic(() => import('./NewApplicationDialog').then((m) => m.NewApplicationDialog), { ssr: false });

const NAV = [
  { href: '/', label: 'Board', Icon: Board },
  { href: '/insights', label: 'Insights', Icon: Chart },
  { href: '/reminders', label: 'Reminders', Icon: Bell },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  useShortcuts();
  const pathname = usePathname();
  const { selectedId, paletteOpen, newOpen, setPalette, openNew } = useUi();
  const { ws } = useWorkspace();
  const push = useToasts((s) => s.push);

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !ws) return;
    const result = parseImport(await file.text());
    if (!result.ok) return push({ message: result.error });
    const n = importInto(ws, result.applications);
    push({ message: `Imported ${n} application${n === 1 ? '' : 's'}`, actionLabel: 'Undo', onAction: ws.undo });
  };

  return (
    <div className="relative flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">
        Skip to content
      </a>
      <div className="floor" aria-hidden="true" />

      <header className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-line bg-glass px-3 backdrop-blur-xl sm:gap-4 sm:px-5">
        <NextLink href="/" className="flex items-center gap-2.5 pr-2 text-base font-semibold md:w-[200px]">
          <Logo />
          <span className="hidden sm:inline">Pipeline</span>
        </NextLink>
        <button
          type="button"
          onClick={() => setPalette(true)}
          aria-label="Search and commands"
          className="flex min-h-11 max-w-[420px] flex-1 items-center gap-2.5 rounded-lg border border-line bg-bg px-3 text-sm text-muted"
        >
          <Search width={16} height={16} />
          <span className="flex-1 truncate text-left">Search or run a command</span>
          <kbd className="hidden rounded border border-line px-1.5 py-0.5 font-mono text-xs sm:inline">⌘K</kbd>
        </button>
        <div className="flex-1" />
        <SyncPill />
        <ThemeToggle />
        <button type="button" onClick={() => openNew()} className="bevel-btn hidden min-h-10 items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium md:flex">
          <Plus width={16} height={16} /> New application
        </button>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1">
        <nav aria-label="Primary" className="hidden w-56 shrink-0 flex-col gap-1 border-r border-line p-3 pt-5 md:flex">
          {NAV.map(({ href, label, Icon }) => {
            const on = pathname === href;
            return (
              <NextLink key={href} href={href} aria-current={on ? 'page' : undefined} className={`flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-sm ${on ? 'bg-accent-soft font-medium text-accent-text' : 'text-muted hover:text-ink'}`}>
                <Icon /> {label}
              </NextLink>
            );
          })}
        </nav>
        <main id="main" className="min-w-0 flex-1 px-4 pb-28 pt-5 md:px-6 md:pb-10 md:pt-6">{children}</main>
      </div>

      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-glass backdrop-blur-xl md:hidden">
        {NAV.map(({ href, label, Icon }) => {
          const on = pathname === href;
          return (
            <NextLink key={href} href={href} aria-current={on ? 'page' : undefined} className={`flex min-h-[60px] flex-1 flex-col items-center justify-center gap-0.5 text-xs ${on ? 'font-medium text-accent-text' : 'text-muted'}`}>
              <Icon /> {label}
            </NextLink>
          );
        })}
      </nav>
      <button type="button" aria-label="New application" onClick={() => openNew()} className="bevel-btn fixed bottom-[76px] right-4 z-30 flex size-14 items-center justify-center rounded-2xl md:hidden">
        <Plus width={24} height={24} strokeWidth={2.5} />
      </button>

      {selectedId && <CardDrawer />}
      {paletteOpen && <CommandPalette />}
      {newOpen && <NewApplicationDialog />}
      <Toasts />
      <input id="import-input" type="file" accept="application/json,.json" className="hidden" onChange={onImport} tabIndex={-1} aria-hidden="true" />
    </div>
  );
}
