import * as Y from 'yjs';

type Message = { t: 'update'; u: Uint8Array } | { t: 'sv'; sv: Uint8Array; reply: boolean };

/**
 * Syncs a Y.Doc between tabs of the same browser using BroadcastChannel.
 * No server and no account: the tabs just exchange Yjs updates.
 *
 * On start, a tab announces its state vector. Peers answer with whatever it is
 * missing, and ask for whatever they are missing in return.
 */
export class BroadcastSync {
  private channel: BroadcastChannel | null = null;

  constructor(
    private readonly doc: Y.Doc,
    name: string,
  ) {
    if (typeof BroadcastChannel === 'undefined') return;
    this.channel = new BroadcastChannel(name);
    this.channel.onmessage = this.onMessage;
    doc.on('update', this.onUpdate);
    this.post({ t: 'sv', sv: Y.encodeStateVector(doc), reply: true });
  }

  private post(m: Message) {
    this.channel?.postMessage(m);
  }

  private onUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === this) return; // do not echo what we just received
    this.post({ t: 'update', u: update });
  };

  private onMessage = (e: MessageEvent<Message>) => {
    const m = e.data;
    if (m.t === 'update') {
      Y.applyUpdate(this.doc, m.u, this);
      return;
    }
    this.post({ t: 'update', u: Y.encodeStateAsUpdate(this.doc, m.sv) });
    if (m.reply) this.post({ t: 'sv', sv: Y.encodeStateVector(this.doc), reply: false });
  };

  destroy() {
    this.doc.off('update', this.onUpdate);
    this.channel?.close();
    this.channel = null;
  }
}
