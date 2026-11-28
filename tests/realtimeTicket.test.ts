import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { requestStreamUrl } from '../src/services/realtimeTicket';

const JWT = 'eyJhbGciOiJIUzI1NiJ9.payload.signature';
const fakeFetch = (status: number, body: unknown, seen: { url?: string; init?: RequestInit } = {}): typeof fetch =>
  (async (url: string, init?: RequestInit) => {
    seen.url = url; seen.init = init;
    return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
  }) as unknown as typeof fetch;

describe('realtime stream authentication (S-1)', () => {
  test('the stream URL carries only the ticket, never the login JWT', async () => {
    const seen: { url?: string; init?: RequestInit } = {};
    const url = await requestStreamUrl('/api', JWT, fakeFetch(200, { success: true, data: { ticket: 'tk_abc-123', expiresInSeconds: 30 } }, seen));
    assert.equal(url, '/api/realtime/stream?ticket=tk_abc-123');
    assert.ok(!url!.includes(JWT) && !/token=/i.test(url!));
    // the JWT is sent in a header on a POST, not in the URL
    assert.equal(seen.url, '/api/realtime/ticket');
    assert.equal(seen.init?.method, 'POST');
    assert.equal((seen.init?.headers as Record<string, string>).Authorization, `Bearer ${JWT}`);
  });

  test('the ticket is URL-encoded', async () => {
    const url = await requestStreamUrl('/api', JWT, fakeFetch(200, { data: { ticket: 'a b&c=d' } }));
    assert.equal(url, '/api/realtime/stream?ticket=a%20b%26c%3Dd');
  });

  test('no stream URL when the server refuses or answers without a ticket (no fabricated fallback)', async () => {
    assert.equal(await requestStreamUrl('/api', JWT, fakeFetch(401, { success: false })), null);
    assert.equal(await requestStreamUrl('/api', JWT, fakeFetch(200, { data: {} })), null);
    assert.equal(await requestStreamUrl('/api', JWT, fakeFetch(200, { data: { ticket: '' } })), null);
  });

  test('a network failure surfaces as an error so the caller can retry with a fresh ticket', async () => {
    const boom = (async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    await assert.rejects(requestStreamUrl('/api', JWT, boom));
  });

  test('no frontend source builds a URL with the login token in the query string', () => {
    const sync = readFileSync(new URL('../src/services/dataSync.ts', import.meta.url), 'utf8');
    assert.ok(!/realtime\/stream\?token/.test(sync));
    assert.ok(!/EventSource\([^)]*token/.test(sync));
    assert.ok(/requestStreamUrl\(/.test(sync));
  });
});
