# Pipeline

A job application tracker that works offline and keeps your data on your device. Drag applications across a board from Wishlist to Offer, see your funnel, and pick up where you left off on any tab or device, with no account.

The interesting engineering decision: **the whole workspace is a Yjs CRDT.** Offline edits from two tabs or two devices merge without conflicts, and there is no backend to build or trust.

## Features

- Board with six stages, drag-and-drop with fractional ordering, and a keyboard and touch alternative (reorder handle, plus a "Move to" menu on every card)
- Card drawer: details, timeline (stage changes and notes), contacts, reminders
- Search and filters stored in the URL, so a filtered view is a shareable link
- Insights worked out from the timeline: funnel, response rate, interview rate, median days to reply, weekly activity
- Command palette (⌘K / Ctrl+K) with fuzzy search over commands and applications
- Undo and redo (⌘Z / ⇧⌘Z), including drags, edits, archive and delete
- Sync status in the header: saved, offline, connecting, syncing, synced
- JSON import and export, CSV export
- Light and dark theme (follows the system until you choose), reduced-motion support
- Responsive: stage tabs and a bottom bar on phones, board and sidebar on desktop

Keyboard: `⌘K` palette, `N` new application, `/` search, `⌘Z` undo, `⇧⌘Z` redo.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 90 tests
npm run typecheck && npm run lint
npm run build && npm start
```

Click **Load sample applications** on the empty board to see it populated.

### Sync between devices (optional)

Tabs in one browser sync with no setup. To sync devices, run a sync server and point the app at it:

```bash
npm run sync-server                          # y-websocket on ws://localhost:1234
# create .env.local containing:  NEXT_PUBLIC_SYNC_URL=ws://localhost:1234
npm run dev
```

Open the sync pill in the header, copy the **room key**, and join that room on another device. In production, host the server on any Node host (Fly.io, Railway, a small VPS), serve it over `wss://`, and set `NEXT_PUBLIC_SYNC_URL` in your app's environment. The Next.js app itself is static and deploys to Vercel as is.

## Architecture

```
React components ──read──▶ useApplications()  ──▶  Workspace (Yjs Y.Doc)  ◀── source of truth
       │                        (plain objects)          │          │          │
   Zustand                                        y-indexeddb  BroadcastChannel  y-websocket
 (UI state only:                                  (offline,     (other tabs)     (other devices,
  open card, palette)                              survives                        optional)
                                                   reload)
```

- `src/lib/doc.ts` is the only code that touches Yjs. Each application is a `Y.Map`, so two people editing different fields of one card both win. Components read plain objects through `useSyncExternalStore`, with a snapshot that keeps the same reference until the document changes.
- **UI state is separate from data.** Zustand holds what is open; everything the user would call their data lives in the document.
- `src/lib/sync/` stacks three layers: IndexedDB, a small BroadcastChannel provider for tabs, and an optional WebSocket provider for devices.
- Stats are never stored. `computeInsights` derives them from each application's event timeline.

### Ordering

Each card has a fractional index (`fractional-indexing`) that sorts lexicographically within its stage. Moving a card writes one new key between its neighbours, so only that card changes. This is why two devices can reorder the same column offline without rewriting each other's work.

If two devices drop different cards into the same slot, both get the same key. Every device sorts ties by id, so they agree on the order immediately, and the next move into that column rebalances it. This case has its own test.

### Undo

`Y.UndoManager` tracks only edits made on this device (transaction origin `local`), so undo never reverts what another device did. Each drag, archive, delete and add is its own undo step.

### Why a CRDT, and what it costs

| Gain | Cost |
|---|---|
| Edits merge from any number of offline devices | The document keeps history, so it grows over time (fine for hundreds of applications, not for millions of edits) |
| No server logic or accounts to build | No server-side validation, and anyone with a room key can edit |
| Instant local writes, so no optimistic-update rollback is needed | Bundle size: Yjs and its providers add about 60 kB |

"Optimistic UI" here is by construction: every write lands in the local document first. There is nothing to roll back, because there is no remote write that can fail.

## Testing

`npm test` runs 90 tests:

- **Ordering, stats, filters, schemas, import/export, drop-position logic**: pure functions.
- **The document**: add, move, undo and redo, and **two replicas merging offline edits** (different fields, concurrent adds, concurrent moves, same-slot collisions, undo that leaves the other device's edits alone).
- **Cross-tab sync**: two `BroadcastSync` instances converge, including edits made while disconnected.
- **Device sync through a real server**: the test starts the actual y-websocket server, takes one device offline, edits on both, and checks they merge on reconnect.
- **Components** (jsdom): board, empty state, filters in the URL, new-application validation, command palette keyboard flow, the drawer's forms and undo toasts, insights numbers, reminders, sync panel.

**What is not covered.** There are no real-browser tests. Pointer drags, touch drags and the keyboard drag sensor were not exercised end to end; the drop logic is unit-tested and the "Move to" menu is covered, but a Playwright test for drag-and-drop and a two-tab offline scenario is the next thing to add. The 3D tilt and animation are visual and were not checked in a browser here.

## Known limitations

- **No service worker.** The app works offline once loaded and keeps saving, but reloading the page with no connection needs a cached copy. Add a service worker (or `@serwist/next`) for full offline loads.
- **No accounts or access control.** A room key is a shared secret. Roles (owner, member, viewer) are not built.
- **No virtualization.** The board renders every card. That is comfortable for hundreds of applications.
- **Settings page, calendar view and attachments** from the original plan are not built. The stale threshold is a constant (7 days) in `src/lib/filters.ts`.
- Deleted applications can be restored with Undo during the session, but there is no trash.

## Project layout

```
src/app            routes: board, insights, reminders, error boundary, global styles
src/components     Board, Card, CardDrawer, CommandPalette, SyncPanel, forms, shell
src/hooks          workspace context, URL filters, shortcuts, dialog focus, theme
src/lib            doc (Yjs), ordering, drop, stats, filters, schema, transfer, sync/
src/store          zustand: ui, sync status, toasts
```

Stack: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 3, Yjs, @dnd-kit, React Hook Form with Zod, Zustand, Vitest with Testing Library.
