import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from './store.js';
import { createApi } from './server.js';

test('delete cow detaches collar, preserves readings and other cows, and survives restart', async t => {
  const folder = mkdtempSync(join(tmpdir(), 'eco-herd-delete-'));
  const file = join(folder, 'db.sqlite');
  let store = openStore(file);
  const cow = store.createLivestock({ display_id: 'Delete me' });
  const other = store.createLivestock({ display_id: 'Keep me' });
  const mac = '02:00:00:00:00:01';
  const sample = { device_id: mac, record_seq: 1, seq: 1, uptime_ms: 100, queue_age_ms: 0,
    temperature_valid: false, motion_valid: false, temperature_c: null, temperature_age_ms: null,
    acceleration_mg: null, gyro_rad_s: null };
  store.ingest({ version: 1, gateway_id: mac, session_id: 'delete-test', samples: [sample] });
  store.assign(mac, { cow_id: cow.id, cow_name: cow.display_id, include_unassigned: true });
  const server = createApi(store);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { await new Promise(resolve => server.close(resolve)); store.close(); rmSync(folder, { recursive: true }); });
  const url = `http://127.0.0.1:${server.address().port}/api/livestock/${cow.id}`;
  const preflight = await fetch(url, { method: 'OPTIONS' });
  assert.match(preflight.headers.get('access-control-allow-methods'), /DELETE/);
  assert.equal((await fetch(url, { method: 'DELETE' })).status, 200);
  assert.equal((await fetch(url, { method: 'DELETE' })).status, 404);
  store.close();
  store = openStore(file);
  assert.deepEqual(store.livestock().map(item => item.id), [other.id]);
  assert.equal(store.devices()[0].cow_id, null);
  assert.equal(store.devices()[0].cow_name, null);
  assert.equal(store.devices()[0].record_count, 1);
  assert.equal(store.readings({ deviceId: mac, limit: 10 }).readings[0].cow_id, null);
});

test('empty database, actual livestock creation, no invented sensor values, CSV and persistence', async t => {
  const folder = mkdtempSync(join(tmpdir(), 'eco-herd-cows-'));
  const file = join(folder, 'db.sqlite');
  let store = openStore(file);
  const server = createApi(store);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { await new Promise(resolve => server.close(resolve)); store.close(); rmSync(folder, { recursive: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = value => fetch(`${base}/api/livestock`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value),
  });
  assert.deepEqual(await (await fetch(`${base}/api/livestock`)).json(), { livestock: [] });
  assert.deepEqual(await (await fetch(`${base}/api/devices`)).json(), { devices: [] });
  assert.equal((await post({ display_id: '' })).status, 400);
  assert.equal((await post({ display_id: 'Test', weight_kg: '500' })).status, 400);
  assert.equal((await post({ display_id: 'Test', sex: 'bad' })).status, 400);
  const response = await post({ display_id: 'Uji nyata', breed: '', weight_kg: null });
  assert.equal(response.status, 201);
  const cow = await response.json();
  assert.equal(cow.weight_kg, null);
  assert.equal(cow.breed, '');
  assert.equal(cow.temperature, undefined);
  assert.equal(cow.healthStatus, undefined);
  assert.equal(cow.activity, undefined);
  assert.equal((await post({ display_id: 'uji nyata' })).status, 400);
  await post({ display_id: '=FORMULA,"test"' });
  const csv = await fetch(`${base}/api/reports/livestock.csv`);
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get('content-type'), /text\/csv/);
  const content = await csv.text();
  assert.ok(content.includes('"\'=FORMULA,""test"""'));
  assert.ok(content.includes('Uji nyata'));
  assert.ok(!content.includes('methane'));
  store.close();
  store = openStore(file);
  assert.equal(store.livestock().length, 2);
  assert.equal(store.livestock().find(row => row.id === cow.id).record_count, 0);
  assert.equal(store.devices().length, 0);
});
