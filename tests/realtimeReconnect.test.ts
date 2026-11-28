import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

// Minimal browser stubs so dataSync.ts can run under node.
const store = new Map<string, string>();
const JWT = 'eyJhbGciOiJIUzI1NiJ9.login.jwt';
const g = globalThis as any;
g.window = { location: { href: 'http://localhost/', origin: 'http://localhost' }, addEventListener: () => {} };
g.document = { addEventListener: () => {}, visibilityState: 'visible' };
g.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};
const sources: Array<{ url: string; closed: boolean; onerror?: () => void; onopen?: () => void; close(): void; addEventListener(): void }> = [];
class FakeEventSource {
  static CLOSED = 2;
  readyState = 1;
  onerror?: () => void;
  onopen?: () => void;
  closed = false;
  constructor(public url: string) { sources.push(this as any); }
  addEventListener() {}
  close() { this.closed = true; this.readyState = 2; }
}
g.EventSource = FakeEventSource;

let ticketCounter = 0;
const requested: Array<{ url: string; auth: string | undefined }> = [];
g.fetch = async (url: string, init?: RequestInit) => {
  requested.push({ url, auth: (init?.headers as Record<string, string> | undefined)?.Authorization });
  if (url.endsWith('/realtime/ticket')) {
    ticketCounter++;
    return { ok: true, json: async () => ({ data: { ticket: `ticket-${ticketCounter}` } }) };
  }
  return { ok: false, json: async () => ({}) };
};

const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

describe('realtime reconnect (S-1)', () => {
  test('every (re)connect fetches a NEW ticket; the JWT never appears in an EventSource URL; logout closes the stream', async () => {
    const { TOKEN_STORAGE_KEY } = await import('../src/services/api');
    const { initRealtimeSync, disconnectRealtimeSync } = await import('../src/services/dataSync');
    store.set(TOKEN_STORAGE_KEY, JWT);
    mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
    try {
      initRealtimeSync();
      initRealtimeSync(); // a second call while connecting must not open a second stream or burn a second ticket
      await flush();
      assert.equal(sources.length, 1);
      assert.equal(ticketCounter, 1);
      assert.match(sources[0].url, /\/realtime\/stream\?ticket=ticket-1$/);

      // connection drops -> the browser reports an error -> client reconnects with a fresh ticket
      sources[0].onerror!();
      assert.equal(sources[0].closed, true);
      mock.timers.tick(60_000);
      await flush();
      assert.equal(sources.length, 2);
      assert.equal(ticketCounter, 2);
      assert.match(sources[1].url, /ticket=ticket-2$/);
      assert.notEqual(sources[0].url, sources[1].url, 'a used ticket must never be replayed');

      // the login JWT only ever travels in the Authorization header of the ticket request
      for (const s of sources) assert.ok(!s.url.includes(JWT) && !/token=/i.test(s.url));
      assert.ok(requested.filter((r) => r.url.endsWith('/realtime/ticket')).every((r) => r.auth === `Bearer ${JWT}`));
      assert.ok(requested.every((r) => !r.url.includes(JWT)));

      // logout closes the stream and nothing reconnects afterwards
      store.delete(TOKEN_STORAGE_KEY);
      disconnectRealtimeSync();
      assert.equal(sources[1].closed, true);
      mock.timers.tick(120_000);
      await flush();
      assert.equal(sources.length, 2);
      assert.equal(ticketCounter, 2);
    } finally {
      mock.timers.reset();
    }
  });
});
