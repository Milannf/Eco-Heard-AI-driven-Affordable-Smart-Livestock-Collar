import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { openStore } from './store.js';
import { createApi } from './server.js';
import { createInference } from './inference.js';

const device = '00:11:22:33:44:55';
const modelDir = process.env.AI_MODEL_DIR || 'C:/Eco-Herd';
const python = process.env.AI_PYTHON || fileURLToPath(new URL(
  process.platform === 'win32' ? './.venv/Scripts/python.exe' : './.venv/bin/python', import.meta.url));

test('HTTP ingest -> database window -> Python -> real joblib prediction', {
  skip: !existsSync(python) || !existsSync(`${modelDir}/behaviour_lgbm.joblib`), timeout: 45000,
}, async t => {
  const inference = createInference({ python, modelDir });
  const store = openStore(':memory:');
  const server = createApi(store, inference);
  t.after(async () => { inference.close(); await new Promise(resolve => server.close(resolve)); store.close(); });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const getPrediction = async () => (await fetch(`${base}/api/ai/behaviour?device_id=${device}`)).json();
  while (inference.status().status === 'loading') await delay(50);
  assert.equal(inference.status().status, 'ready', inference.status().message);
  assert.equal((await getPrediction()).status, 'waiting');
  assert.equal((await fetch(`${base}/api/ai/behaviour`)).status, 400);
  assert.equal((await fetch(`${base}/api/ai/behaviour?device_id=bad`)).status, 400);
  const status = await (await fetch(`${base}/api/ai/status`)).json();
  assert.equal(status.metadata.feature_count, 37);

  const makeBatch = start => ({
    version: 1, gateway_id: 'AA:BB:CC:DD:EE:FF', session_id: 'synthetic-test-session',
    samples: Array.from({ length: 50 }, (_, i) => ({
      device_id: device, record_seq: start + i, seq: start + i, uptime_ms: (start + i) * 100,
      queue_age_ms: (100 - start - i) * 100, temperature_valid: true, motion_valid: true,
      temperature_c: 37, temperature_age_ms: 50,
      acceleration_mg: { x: 0, y: 0, z: 1000 }, gyro_rad_s: { x: 0, y: 0, z: 0 },
    })),
  });
  async function ingest(body) {
    const response = await fetch(`${base}/api/telemetry/batch`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    assert.equal(response.status, 200);
    return response.json();
  }
  await ingest(makeBatch(1));
  assert.equal((await getPrediction()).status, 'waiting');
  await ingest(makeBatch(51));
  const result = await getPrediction();
  assert.equal(result.status, 'experimental', JSON.stringify(result));
  assert.equal(result.window.samples, 100);
  assert.equal(result.window.device_id, device);
  assert.equal(result.window.temperature_mean_c, 37);
  assert.ok(result.prediction.class_id >= 0 && result.prediction.class_id < 5);
  assert.ok(Math.abs(result.prediction.probabilities.reduce((sum, p) => sum + p.probability, 0) - 1) < 1e-9);
  assert.equal(result.metadata.preprocessing_verified, false);
  if (result.metadata.label_issue) assert.equal(result.prediction.label, null);

  assert.equal((await ingest(makeBatch(51))).duplicates, 50);
  const repeated = await getPrediction();
  assert.deepEqual(repeated.prediction, result.prediction);
  const invalid = makeBatch(51);
  invalid.samples = [{ ...invalid.samples[0], record_seq: 101, seq: 101, uptime_ms: 10100,
    queue_age_ms: 0, temperature_valid: false, temperature_c: null, temperature_age_ms: null }];
  await ingest(invalid);
  const rejected = await getPrediction();
  assert.equal(rejected.status, 'invalid_sensor');
  assert.equal(rejected.prediction, undefined);
});

test('missing Python reports error without crashing telemetry server', { timeout: 5000 }, async () => {
  const inference = createInference({ python: 'ecoherd-python-does-not-exist', modelDir });
  try {
    while (inference.status().status === 'loading') await delay(10);
    assert.equal(inference.status().status, 'model_error');
    assert.equal((await inference.predict([])).status, 'model_error');
  } finally { inference.close(); }
});
