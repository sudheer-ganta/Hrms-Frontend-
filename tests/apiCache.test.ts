import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { InternalAxiosRequestConfig } from 'axios';
import { api, apiClient, clearApiCache, refreshApiData } from '../src/services/api';

let calls: string[] = [];
const respond = (config: InternalAxiosRequestConfig, data: unknown) =>
  Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config });

beforeEach(() => {
  calls = [];
  clearApiCache();
  apiClient.defaults.adapter = (config) => {
    const url = config.url || '';
    calls.push(`${(config.method || 'get').toUpperCase()} ${url}`);
    if (url === '/employees') return respond(config, { success: true, data: [{ empCode: '1' }] });
    if (url === '/attendance/days') return respond(config, { success: true, data: [], pagination: { page: 1 } });
    return respond(config, { success: true, data: { ok: true } });
  };
});

describe('API read cache', () => {
  test('a repeat read is served from the cache', async () => {
    await api.getAllEmployees();
    await api.getAllEmployees();
    assert.equal(calls.length, 1);
  });

  test('simultaneous identical reads share one request', async () => {
    await Promise.all([api.getAllEmployees(), api.getAllEmployees(), api.getAllEmployees()]);
    assert.equal(calls.length, 1);
  });

  test('different parameters are different entries', async () => {
    await api.getAttendanceDays({ fromDate: '2026-10-01', toDate: '2026-10-01' });
    await api.getAttendanceDays({ fromDate: '2026-10-02', toDate: '2026-10-02' });
    assert.equal(calls.length, 2);
  });

  test('paginated (non-envelope) responses keep their shape', async () => {
    const res = await api.getAttendanceDays({});
    assert.deepEqual(res.pagination, { page: 1 });
  });

  test('a write empties the cache so the next read is fresh', async () => {
    await api.getAllEmployees();
    await api.approveRequest('r1');
    await api.getAllEmployees();
    assert.equal(calls.filter((c) => c === 'GET /employees').length, 2);
  });

  test('the Refresh buttons force a real round trip', async () => {
    await api.getAllEmployees();
    refreshApiData();
    await api.getAllEmployees();
    assert.equal(calls.length, 2);
  });

  test('a response that was in flight during a write is not kept', async () => {
    const slow = api.getAllEmployees();
    clearApiCache(); // a write lands while the read is still on the wire
    await slow;
    await api.getAllEmployees();
    assert.equal(calls.length, 2);
  });

  test('live status endpoints are never cached', async () => {
    await api.getTodayPunchStatus();
    await api.getTodayPunchStatus();
    assert.equal(calls.length, 2);
  });
});
