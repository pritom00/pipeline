import { spawn, type ChildProcess } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import WebSocket from 'ws';
import { Workspace } from '../doc';

/**
 * Integration test against the real y-websocket server (the one `npm run sync-server` starts):
 * two "devices" sync through it, one goes offline, both edit, and they merge on reconnect.
 */
const PORT = 41234 + Math.floor(Math.random() * 500);
const SERVER_URL = `ws://127.0.0.1:${PORT}`;
const ROOM = 'pipeline:integration-test';
let server: ChildProcess;

const until = async (check: () => boolean, ms = 15000) => {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > ms) throw new Error('timed out waiting for sync');
    await new Promise((r) => setTimeout(r, 25));
  }
};

const device = () => {
  const ws = new Workspace(new Y.Doc());
  const provider = new WebsocketProvider(SERVER_URL, ROOM, ws.doc, {
    WebSocketPolyfill: WebSocket as unknown as typeof globalThis.WebSocket,
    resyncInterval: 500,
  });
  return { ws, provider };
};

const canConnect = () =>
  new Promise<boolean>((resolve) => {
    const socket = net.connect(PORT, '127.0.0.1');
    socket.once('connect', () => (socket.destroy(), resolve(true)));
    socket.once('error', () => resolve(false));
  });

beforeAll(async () => {
  let output = '';
  let exited: number | null = null;
  server = spawn(process.execPath, [path.resolve('node_modules/y-websocket/bin/server.cjs')], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout!.on('data', (d) => (output += String(d)));
  server.stderr!.on('data', (d) => (output += String(d)));
  server.on('exit', (code) => (exited = code ?? -1));

  // Poll the port instead of waiting for a log line: slow machines and Windows start this late.
  const deadline = Date.now() + 40000;
  while (!(await canConnect())) {
    if (exited !== null) throw new Error(`sync server exited with code ${exited}. Output:\n${output}`);
    if (Date.now() > deadline) throw new Error(`sync server did not start within 40s. Output:\n${output}`);
    await new Promise((r) => setTimeout(r, 150));
  }
}, 60000);

afterAll(() => {
  server?.kill();
});

describe('sync through a y-websocket server', () => {
  it('shares edits between devices, and merges offline edits on reconnect', async () => {
    const phone = device();
    const laptop = device();
    try {
      await until(() => phone.provider.synced && laptop.provider.synced);

      const id = phone.ws.add({ company: 'Acme', role: 'Engineer' });
      await until(() => laptop.ws.getSnapshot().length === 1);

      // Laptop goes offline. Both keep editing.
      laptop.provider.disconnect();
      await until(() => !laptop.provider.wsconnected);
      phone.ws.update(id, { salary: '$120k' });
      laptop.ws.update(id, { location: 'Remote' });
      const other = laptop.ws.add({ company: 'Offline Inc', role: 'Designer' });
      expect(phone.ws.getSnapshot().find((a) => a.id === id)?.location).toBe('');

      // Reconnect: everything merges, nothing is lost.
      laptop.provider.connect();
      await until(() => {
        const a = phone.ws.getSnapshot().find((x) => x.id === id);
        const b = laptop.ws.getSnapshot().find((x) => x.id === id);
        return a?.location === 'Remote' && b?.salary === '$120k' && phone.ws.getSnapshot().some((x) => x.id === other);
      });
      expect(phone.ws.getSnapshot()).toHaveLength(2);
      expect(laptop.ws.getSnapshot()).toHaveLength(2);
    } finally {
      phone.provider.destroy();
      laptop.provider.destroy();
    }
  }, 40000);
});
