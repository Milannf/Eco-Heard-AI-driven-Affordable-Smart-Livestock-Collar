import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { openStore } from './store.js';
import { createApi } from './server.js';

const device = '68:09:47:4C:F2:54';
function payload(recordSeq = 1) {
  return {
    version: 1, gateway_id: 'AA:BB:CC:DD:EE:FF', session_id: 'test-session-1',
    samples: [{
      device_id: device, record_seq: recordSeq, seq: 560, uptime_ms: 56927,
      queue_age_ms: 100, temperature_valid: true, motion_valid: true,
      temperature_c: 26.19, temperature_age_ms: 252,
      acceleration_mg: { x: 40.8, y: 35.6, z: 1095 },
      gyro_rad_s: { x: -0.023, y: 0.028, z: 0.019 },
    }],
  };
}

test('HTTP ingest, read, assignment, retries and pagination', async t => {
  const store = openStore(':memory:');
  const server = createApi(store);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    store.close();
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const send = (path, body, method = 'POST') => fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  assert.equal((await fetch(base + '/health')).status, 200);
  let response = await send('/telemetry/batch', payload());
  assert.deepEqual(await response.json(), { accepted: 1, inserted: 1, duplicates: 0 });
  const retry = payload();
  retry.samples[0].queue_age_ms = 5100;
  response = await send('/telemetry/batch', retry);
  assert.equal((await response.json()).duplicates, 1);

  response = await send(`/devices/${device}/assignment`, {
    cow_id: '042', cow_name: 'Sapi #042', include_unassigned: true,
  }, 'PUT');
  assert.equal(response.status, 200);
  await send('/telemetry/batch', payload(2));
  const list = await (await fetch(base + '/devices')).json();
  assert.equal(list.devices[0].record_count, 2);
  assert.equal(list.devices[0].latest.temperature_c, 26.19);
  assert.equal(list.devices[0].latest.cow_id, '042');
  const page = await (await fetch(base + '/readings?cow_id=042&limit=1')).json();
  assert.equal(page.readings[0].record_seq, 2);
  const older = await (await fetch(base + `/readings?cow_id=042&before=${page.next_before}`)).json();
  assert.equal(older.readings[0].record_seq, 1);

  await send(`/devices/${device}/assignment`, {
    cow_id: '043', cow_name: 'Sapi #043', include_unassigned: false,
  }, 'PUT');
  const reboot = payload(3);
  reboot.samples[0].seq = 1; // A reset di tengah sesi B tidak dianggap duplikat.
  await send('/telemetry/batch', reboot);
  assert.equal(store.readings({ cowId: '042' }).readings.length, 2);
  assert.equal(store.readings({ cowId: '043' }).readings.length, 1);
  const newSession = payload(1);
  newSession.session_id = 'test-session-2'; // B reset: nomor boleh kembali 1.
  await send('/telemetry/batch', newSession);
  assert.equal(store.devices()[0].record_count, 4);
});

test('Invalid samples reject whole batch, and invalid sensor uses null', () => {
  const store = openStore(':memory:');
  try {
    const mixed = payload();
    mixed.samples.push({ ...payload(2).samples[0], temperature_c: 200 });
    assert.throws(() => store.ingest(mixed), /rentang/);
    assert.equal(store.devices().length, 0);
    const invalid = payload();
    Object.assign(invalid.samples[0], {
      temperature_valid: false, temperature_c: null, temperature_age_ms: null,
      motion_valid: false, acceleration_mg: null, gyro_rad_s: null,
    });
    store.ingest(invalid);
    assert.equal(store.devices()[0].latest.temperature_c, null);
    assert.throws(() => store.ingest(payload()), /digunakan ulang/);
    assert.equal(store.devices()[0].record_count, 1);
    assert.throws(() => store.readings({ deviceId: device, limit: 999999 }), /limit/);
    assert.throws(() => store.ingest({ ...payload(), samples: Array(51).fill(payload().samples[0]) }), /1–50/);
  } finally { store.close(); }
});

function audioPayload(recordSeq = 1) {
  const body = payload(recordSeq);
  body.version = 2;
  Object.assign(body.samples[0], {
    audio_valid: true,
    audio: {
      rms: 0.01, peak: 0.03, dbfs: -40, age_ms: 20,
      sample_rate_hz: 16000, window_ms: 100, clipped: false,
    },
  });
  return body;
}

test('Audio v2 survives HTTP ingest, GET history, and duplicate retry', async t => {
  const store = openStore(':memory:');
  const server = createApi(store);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    store.close();
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const post = body => fetch(base + '/telemetry/batch', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  assert.equal((await post(audioPayload())).status, 200);
  const retry = audioPayload();
  retry.samples[0].queue_age_ms = 5000;
  assert.equal((await (await post(retry)).json()).duplicates, 1);
  const saved = await (await fetch(base + `/readings?device_id=${device}`)).json();
  assert.deepEqual(saved.readings[0].audio, audioPayload().samples[0].audio);
  const micDisconnected = audioPayload(2);
  micDisconnected.samples[0].audio_valid = false;
  micDisconnected.samples[0].audio = null;
  assert.equal((await post(micDisconnected)).status, 200);
  assert.equal(store.devices()[0].latest.audio_valid, false);
  assert.equal(store.devices()[0].latest.temperature_c, 26.19);
  assert.equal(store.devices()[0].latest.audio, null);
});

test('Audio rejects malformed fields, inconsistent units, stale windows, and mixed invalid batches', () => {
  const store = openStore(':memory:');
  try {
    for (const patch of [
      { rms: -1 }, { peak: 2 }, { dbfs: 60 }, { dbfs: -20 }, { sample_rate_hz: 0 },
      { window_ms: 0 }, { clipped: 'false' }, { age_ms: 501 }, { rms: 0.04 },
    ]) {
      const invalid = audioPayload(2);
      Object.assign(invalid.samples[0].audio, patch);
      invalid.samples.unshift(audioPayload(1).samples[0]);
      assert.throws(() => store.ingest(invalid));
      assert.equal(store.devices().length, 0);
    }
    const invalidFlag = audioPayload();
    invalidFlag.samples[0].audio_valid = false;
    assert.throws(() => store.ingest(invalidFlag), /null/);
    const missingFlag = audioPayload();
    delete missingFlag.samples[0].audio_valid;
    assert.throws(() => store.ingest(missingFlag), /boolean/);
    const clipping = audioPayload();
    Object.assign(clipping.samples[0].audio, { rms: 1, peak: 1, dbfs: 0, clipped: true });
    store.ingest(clipping);
    assert.equal(store.devices()[0].latest.audio.clipped, true);
    const floor = audioPayload(2);
    Object.assign(floor.samples[0].audio, { rms: 0.00000012, peak: 0.00000012, dbfs: -120 });
    store.ingest(floor);
    assert.equal(store.devices()[0].latest.audio.dbfs, -120);
  } finally { store.close(); }
});

test('Readings and collar assignment survive database reopen', () => {
  const directory = mkdtempSync(join(tmpdir(), 'eco-herd-test-'));
  const path = join(directory, 'records.sqlite');
  let store = openStore(path);
  try {
    store.ingest(audioPayload());
    store.assign(device, { cow_id: '042', cow_name: 'Sapi #042', include_unassigned: true });
    store.close();
    store = openStore(path);
    assert.equal(store.devices()[0].cow_id, '042');
    assert.equal(store.readings({ cowId: '042' }).readings[0].temperature_c, 26.19);
    assert.deepEqual(store.readings({ cowId: '042' }).readings[0].audio, audioPayload().samples[0].audio);
    assert.equal(store.ingest(audioPayload()).duplicates, 1);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
