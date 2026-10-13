// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceContext } from '@/hooks/useWorkspace';
import { Workspace } from '@/lib/doc';
import { sampleApplications } from '@/lib/sample';
import { useSync } from '@/store/sync';
import { useToasts } from '@/store/toast';
import { useUi } from '@/store/ui';

const router = { push: vi.fn(), replace: vi.fn() };
let search = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/',
  useSearchParams: () => search,
}));

import { Board } from './Board';
import { CardDrawer } from './CardDrawer';
import { CommandPalette } from './CommandPalette';
import { InsightsView } from './InsightsView';
import { NewApplicationDialog } from './NewApplicationDialog';
import { RemindersView } from './RemindersView';
import { SyncPanel } from './SyncPanel';

function setup(ui: ReactElement, opts: { sample?: boolean } = {}) {
  const ws = new Workspace();
  if (opts.sample) sampleApplications().forEach((a) => ws.upsert(a));
  render(<WorkspaceContext.Provider value={{ ws, ready: true }}>{ui}</WorkspaceContext.Provider>);
  return ws;
}
const find = (ws: Workspace, company: string) => ws.getSnapshot().find((a) => a.company === company)!;

beforeEach(() => {
  search = new URLSearchParams();
  router.push.mockClear();
  router.replace.mockClear();
  useUi.setState({ selectedId: null, paletteOpen: false, newOpen: false, syncOpen: false, newStage: 'wishlist' });
  useToasts.setState({ toasts: [] });
});

describe('Board', () => {
  it('invites you to add the first application when empty', async () => {
    const user = userEvent.setup();
    const ws = setup(<Board />);
    expect(screen.getByRole('heading', { name: 'Track your first application' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Load sample applications' }));
    expect(ws.getSnapshot().length).toBeGreaterThan(0);
    expect(await screen.findByText('Lumen Works')).toBeInTheDocument();
  });

  it('shows one column per stage with the right cards', () => {
    setup(<Board />, { sample: true });
    const interview = screen.getByRole('region', { name: 'Interview' });
    expect(within(interview).getByText('Lumen Works')).toBeInTheDocument();
    expect(within(interview).getByText('Parcelo')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Offer' })).getByText('Oakridge')).toBeInTheDocument();
  });

  it('flags cards that have waited a week or more for a reply', () => {
    setup(<Board />, { sample: true });
    const applied = screen.getByRole('region', { name: 'Applied' });
    expect(within(applied).getByText(/No reply in 9 days/)).toBeInTheDocument();
    expect(within(applied).getByText(/No reply in 12 days/)).toBeInTheDocument();
    expect(within(applied).getAllByText(/No reply in/)).toHaveLength(2); // Brightloop, at 3 days, is not flagged
  });

  it('moves a card to another stage from its menu, and offers undo', () => {
    const ws = setup(<Board />, { sample: true });
    fireEvent.change(screen.getByLabelText('Move Cartograph to another stage'), { target: { value: 'applied' } });
    expect(find(ws, 'Cartograph').stage).toBe('applied');
    expect(within(screen.getByRole('region', { name: 'Applied' })).getByText('Cartograph')).toBeInTheDocument();
    const toast = useToasts.getState().toasts[0]!;
    expect(toast.message).toBe('Moved Cartograph to Applied');
    act(() => toast.onAction?.());
    expect(find(ws, 'Cartograph').stage).toBe('wishlist');
  });

  it('filters from the URL and says how many are shown', () => {
    search = new URLSearchParams('stale=1');
    setup(<Board />, { sample: true });
    expect(screen.getByText('Northwind Labs')).toBeInTheDocument();
    expect(screen.queryByText('Brightloop')).not.toBeInTheDocument();
    expect(screen.getByText('2 of 10 shown')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Needs follow-up' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('writes a filter change back to the URL', async () => {
    const user = userEvent.setup();
    setup(<Board />, { sample: true });
    await user.click(screen.getByRole('button', { name: 'Remote' }));
    expect(router.replace).toHaveBeenCalledWith('/?remote=1', { scroll: false });
  });

  it('waits for a pause in typing before updating the URL', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      setup(<Board />, { sample: true });
      await user.type(screen.getByLabelText('Search applications'), 'par');
      expect(router.replace).not.toHaveBeenCalled();
      await act(async () => {
        vi.advanceTimersByTime(250);
      });
      expect(router.replace).toHaveBeenCalledTimes(1);
      expect(router.replace).toHaveBeenCalledWith('/?q=par', { scroll: false });
    } finally {
      vi.useRealTimers();
    }
  });

  it('hides archived cards', () => {
    const ws = setup(<Board />, { sample: true });
    act(() => ws.setArchived(find(ws, 'Cartograph').id, true));
    expect(screen.queryByText('Cartograph')).not.toBeInTheDocument();
  });
});

describe('NewApplicationDialog', () => {
  it('explains what is missing instead of adding an empty card', async () => {
    const user = userEvent.setup();
    const ws = setup(<NewApplicationDialog />);
    await user.click(screen.getByRole('button', { name: 'Add application' }));
    expect(await screen.findByText('Enter a company name')).toBeInTheDocument();
    expect(screen.getByText('Enter a role')).toBeInTheDocument();
    expect(ws.getSnapshot()).toHaveLength(0);
  });

  it('validates the link, then adds the application in the chosen stage', async () => {
    const user = userEvent.setup();
    useUi.setState({ newOpen: true, newStage: 'applied' });
    const ws = setup(<NewApplicationDialog />);
    await user.type(screen.getByLabelText('Company'), 'Acme');
    await user.type(screen.getByLabelText('Role'), 'Frontend Engineer');
    await user.type(screen.getByLabelText('Link to the posting'), 'acme.com/jobs');
    await user.click(screen.getByRole('button', { name: 'Add application' }));
    expect(await screen.findByText(/Enter a full link/)).toBeInTheDocument();
    expect(ws.getSnapshot()).toHaveLength(0);

    await user.clear(screen.getByLabelText('Link to the posting'));
    await user.type(screen.getByLabelText('Link to the posting'), 'https://acme.com/jobs');
    await user.click(screen.getByRole('button', { name: 'Add application' }));
    await waitFor(() => expect(ws.getSnapshot()).toHaveLength(1));
    expect(ws.getSnapshot()[0]).toMatchObject({ company: 'Acme', role: 'Frontend Engineer', stage: 'applied' });
    expect(useUi.getState().newOpen).toBe(false);
  });
});

describe('CommandPalette', () => {
  it('runs a command from a fuzzy search with the keyboard', async () => {
    const user = userEvent.setup();
    setup(<CommandPalette />, { sample: true });
    await user.type(screen.getByRole('combobox'), 'insig');
    expect(screen.getByRole('option', { name: /Go to Insights/ })).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(router.push).toHaveBeenCalledWith('/insights');
    expect(useUi.getState().paletteOpen).toBe(false);
  });

  it('finds an application and opens it', async () => {
    const user = userEvent.setup();
    const ws = setup(<CommandPalette />, { sample: true });
    await user.type(screen.getByRole('combobox'), 'lumen');
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Lumen Works · Senior Frontend Engineer');
    await user.keyboard('{Enter}');
    expect(useUi.getState().selectedId).toBe(find(ws, 'Lumen Works').id);
  });

  it('moves the highlight with the arrow keys', async () => {
    const user = userEvent.setup();
    setup(<CommandPalette />, { sample: true });
    const input = screen.getByRole('combobox');
    const options = () => screen.getAllByRole('option');
    expect(options()[0]).toHaveAttribute('aria-selected', 'true');
    await user.type(input, '{ArrowDown}{ArrowDown}');
    expect(options()[2]).toHaveAttribute('aria-selected', 'true');
    await user.type(input, '{ArrowUp}');
    expect(options()[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('offers stage moves for the open application', async () => {
    const user = userEvent.setup();
    const ws = setup(<CommandPalette />, { sample: true });
    useUi.setState({ selectedId: find(ws, 'Parcelo').id });
    await user.type(screen.getByRole('combobox'), 'move to offer');
    await user.keyboard('{Enter}');
    expect(find(ws, 'Parcelo').stage).toBe('offer');
  });

  it('says so when nothing matches', async () => {
    const user = userEvent.setup();
    setup(<CommandPalette />, { sample: true });
    await user.type(screen.getByRole('combobox'), 'zzzqq');
    expect(screen.getByText(/Nothing matches/)).toBeInTheDocument();
  });
});

describe('CardDrawer', () => {
  it('saves edits to the details', async () => {
    const user = userEvent.setup();
    const ws = new Workspace();
    sampleApplications().forEach((a) => ws.upsert(a));
    useUi.setState({ selectedId: find(ws, 'Cartograph').id });
    render(<WorkspaceContext.Provider value={{ ws, ready: true }}><CardDrawer /></WorkspaceContext.Provider>);

    expect(screen.getByRole('dialog', { name: 'Cartograph' })).toBeInTheDocument();
    const save = screen.getByRole('button', { name: 'Save changes' });
    expect(save).toBeDisabled();
    await user.clear(screen.getByLabelText('Company'));
    await user.type(screen.getByLabelText('Company'), 'Cartograph Maps');
    expect(save).toBeEnabled();
    await user.click(save);
    await waitFor(() => expect(ws.getSnapshot().some((a) => a.company === 'Cartograph Maps')).toBe(true));
  });

  it('will not save a blank company', async () => {
    const user = userEvent.setup();
    const ws = new Workspace();
    sampleApplications().forEach((a) => ws.upsert(a));
    useUi.setState({ selectedId: find(ws, 'Cartograph').id });
    render(<WorkspaceContext.Provider value={{ ws, ready: true }}><CardDrawer /></WorkspaceContext.Provider>);
    await user.clear(screen.getByLabelText('Company'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Enter a company name')).toBeInTheDocument();
    expect(find(ws, 'Cartograph')).toBeTruthy();
  });

  it('changes stage right away and records it on the timeline', async () => {
    const user = userEvent.setup();
    const ws = new Workspace();
    sampleApplications().forEach((a) => ws.upsert(a));
    useUi.setState({ selectedId: find(ws, 'Cartograph').id });
    render(<WorkspaceContext.Provider value={{ ws, ready: true }}><CardDrawer /></WorkspaceContext.Provider>);
    await user.selectOptions(screen.getByLabelText('Stage'), 'interview');
    expect(find(ws, 'Cartograph').stage).toBe('interview');
    await user.click(screen.getByRole('tab', { name: 'Timeline' }));
    expect(screen.getByText('Moved to Interview')).toBeInTheDocument();
    expect(screen.getByText('Added to Wishlist')).toBeInTheDocument();
  });

  it('adds a note, a contact and a reminder', async () => {
    const user = userEvent.setup();
    const ws = new Workspace();
    sampleApplications().forEach((a) => ws.upsert(a));
    useUi.setState({ selectedId: find(ws, 'Cartograph').id });
    render(<WorkspaceContext.Provider value={{ ws, ready: true }}><CardDrawer /></WorkspaceContext.Provider>);

    await user.click(screen.getByRole('tab', { name: 'Timeline' }));
    await user.type(screen.getByLabelText('Add a note'), 'Spoke with the recruiter');
    await user.click(screen.getByRole('button', { name: 'Add note' }));
    expect(screen.getByText('Spoke with the recruiter')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Contacts' }));
    await user.click(screen.getByRole('button', { name: 'Add contact' }));
    expect(await screen.findByText('Enter a name')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Name'), 'Sam Rivera');
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Add contact' }));
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), 'sam@example.com');
    await user.click(screen.getByRole('button', { name: 'Add contact' }));
    expect(await screen.findByRole('link', { name: 'sam@example.com' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Reminders' }));
    await user.type(screen.getByLabelText('Follow up on'), 'Ask about next steps');
    await user.click(screen.getByRole('button', { name: 'Add reminder' }));
    expect(await screen.findByLabelText(/Ask about next steps/)).toBeInTheDocument();

    const a = find(ws, 'Cartograph');
    expect(a.contacts).toHaveLength(1);
    expect(a.reminders).toHaveLength(1);
  });

  it('archives with an undo, and closes', async () => {
    const user = userEvent.setup();
    const ws = new Workspace();
    sampleApplications().forEach((a) => ws.upsert(a));
    useUi.setState({ selectedId: find(ws, 'Cartograph').id });
    render(<WorkspaceContext.Provider value={{ ws, ready: true }}><CardDrawer /></WorkspaceContext.Provider>);
    await user.click(screen.getByRole('button', { name: 'Archive' }));
    expect(find(ws, 'Cartograph').archived).toBe(true);
    expect(useUi.getState().selectedId).toBeNull();
    act(() => useToasts.getState().toasts[0]!.onAction?.());
    expect(find(ws, 'Cartograph').archived).toBe(false);
  });

  it('closes itself if the application disappears', () => {
    const ws = new Workspace();
    sampleApplications().forEach((a) => ws.upsert(a));
    const id = find(ws, 'Cartograph').id;
    useUi.setState({ selectedId: id });
    render(<WorkspaceContext.Provider value={{ ws, ready: true }}><CardDrawer /></WorkspaceContext.Provider>);
    act(() => ws.remove(id));
    expect(useUi.getState().selectedId).toBeNull();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const ws = new Workspace();
    sampleApplications().forEach((a) => ws.upsert(a));
    useUi.setState({ selectedId: find(ws, 'Cartograph').id });
    render(<WorkspaceContext.Provider value={{ ws, ready: true }}><CardDrawer /></WorkspaceContext.Provider>);
    await user.keyboard('{Escape}');
    expect(useUi.getState().selectedId).toBeNull();
  });
});

describe('InsightsView', () => {
  it('shows the funnel numbers worked out from the timelines', () => {
    setup(<InsightsView />, { sample: true });
    const tile = (label: string) => screen.getByText(label).nextElementSibling!.textContent;
    expect(tile('Applications sent')).toBe('8');
    expect(tile('Response rate')).toBe('63%');
    expect(tile('Interview rate')).toBe('38%');
  });

  it('explains the empty state', () => {
    setup(<InsightsView />);
    expect(screen.getByText(/Nothing to chart yet/)).toBeInTheDocument();
  });
});

describe('RemindersView', () => {
  it('lists open reminders and clears one when it is ticked', async () => {
    const user = userEvent.setup();
    const ws = setup(<RemindersView />, { sample: true });
    expect(screen.getByText(/You are all caught up/)).toBeInTheDocument();
    const id = find(ws, 'Cartograph').id;
    act(() => ws.addReminder(id, { text: 'Send portfolio', dueAt: '2020-01-01' }));
    expect(screen.getByText('Send portfolio')).toBeInTheDocument();
    expect(screen.getByText(/Overdue/)).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox'));
    expect(screen.queryByText('Send portfolio')).not.toBeInTheDocument();
  });
});

describe('SyncPanel', () => {
  it('explains the current status and rejects a malformed room key', async () => {
    const user = userEvent.setup();
    useSync.setState({ status: 'offline', room: 'abcd-efgh-jkmn', serverUrl: 'ws://localhost:1234', lastSyncedAt: null });
    setup(<SyncPanel />);
    expect(screen.getByRole('heading', { name: 'Offline' })).toBeInTheDocument();
    expect(screen.getByText(/merge when you reconnect/)).toBeInTheDocument();
    expect(screen.getByLabelText('Room key')).toHaveValue('abcd-efgh-jkmn');
    await user.type(screen.getByLabelText('Join another room'), '!!');
    await user.click(screen.getByRole('button', { name: 'Join' }));
    expect(screen.getByText(/Use 4 to 64 letters/)).toBeInTheDocument();
  });

  it('says plainly when no sync server is configured', () => {
    useSync.setState({ status: 'saved', room: 'abcd-efgh-jkmn', serverUrl: null, lastSyncedAt: null });
    setup(<SyncPanel />);
    expect(screen.getByText(/No sync server is set/)).toBeInTheDocument();
  });
});
