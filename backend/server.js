import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { InputError, openStore } from './store.js';
import { createInference } from './inference.js';

async function readJson(request) {
  if (!request.headers['content-type']?.startsWith('application/json')) {
    throw new InputError('Content-Type harus application/json.');
  }
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > 65536) throw new InputError('Payload terlalu besar.');
  }
  try { return JSON.parse(body); }
  catch { throw new InputError('JSON tidak valid.'); }
}

export function createApi(store, inference = null) {
  return createServer(async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    const send = (status, body) => {
      response.writeHead(status);
      response.end(JSON.stringify(body));
    };
    try {
      if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }
      const url = new URL(request.url, 'http://localhost');
      if (request.method === 'GET' && url.pathname === '/api/health') {
        return send(200, { ok: true });
      }
      if (request.method === 'GET' && url.pathname === '/api/ai/status') {
        return send(200, inference?.status() || { status: 'disabled', message: 'Worker AI belum dijalankan.' });
      }
      if (request.method === 'GET' && url.pathname === '/api/ai/behaviour') {
        const deviceId = url.searchParams.get('device_id');
        if (!deviceId) throw new InputError('device_id wajib untuk memilih satu collar.');
        // Database mengembalikan terbaru dahulu. Worker memerlukan urutan kronologis.
        const { readings } = store.readings({ deviceId, limit: 100 });
        return send(200, inference
          ? await inference.predict(readings.reverse())
          : { status: 'disabled', message: 'Worker AI belum dijalankan.' });
      }
      if (request.method === 'POST' && url.pathname === '/api/telemetry/batch') {
        return send(200, store.ingest(await readJson(request)));
      }
      if (request.method === 'GET' && url.pathname === '/api/devices') {
        return send(200, { devices: store.devices() });
      }
      if (request.method === 'GET' && url.pathname === '/api/livestock') {
        return send(200, { livestock: store.livestock() });
      }
      if (request.method === 'POST' && url.pathname === '/api/livestock') {
        return send(201, store.createLivestock(await readJson(request)));
      }
      const livestockItem = url.pathname.match(/^\/api\/livestock\/([a-zA-Z0-9_-]{1,64})$/);
      if (request.method === 'DELETE' && livestockItem) {
        return store.deleteLivestock(livestockItem[1])
          ? send(200, { deleted: true })
          : send(404, { error: 'Sapi tidak ditemukan.' });
      }
      if (request.method === 'GET' && url.pathname === '/api/reports/livestock.csv') {
        const escape = value => {
          let text = String(value ?? '');
          if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
          return '"' + text.replaceAll('"', '""') + '"';
        };
        const columns = ['id', 'display_id', 'breed', 'barn', 'sex', 'weight_kg', 'record_count', 'created_at'];
        const rows = [columns, ...store.livestock().map(cow => columns.map(key => cow[key]))];
        response.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="eco-herd-ternak.csv"' });
        response.end('\uFEFF' + rows.map(row => row.map(escape).join(',')).join('\r\n'));
        return;
      }
      const assignment = url.pathname.match(/^\/api\/devices\/([^/]+)\/assignment$/);
      if (request.method === 'PUT' && assignment) {
        return send(200, store.assign(decodeURIComponent(assignment[1]), await readJson(request)));
      }
      if (request.method === 'GET' && url.pathname === '/api/readings') {
        return send(200, store.readings({
          deviceId: url.searchParams.get('device_id'), cowId: url.searchParams.get('cow_id'),
          before: url.searchParams.get('before'), limit: url.searchParams.get('limit') ?? 50,
        }));
      }
      send(404, { error: 'Endpoint tidak ditemukan.' });
    } catch (error) {
      if (!(error instanceof InputError)) console.error(error);
      send(error instanceof InputError ? 400 : 500, {
        error: error instanceof InputError ? error.message : 'Gagal menyimpan/membaca database.',
      });
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const filename = resolve(process.env.DATA_FILE || fileURLToPath(new URL('./data/eco-herd.sqlite', import.meta.url)));
  mkdirSync(dirname(filename), { recursive: true });
  const store = openStore(filename);
  const inference = createInference();
  const server = createApi(store, inference);
  server.on('close', () => inference.close());
  const port = Number(process.env.PORT || 3001);
  server.listen(port, process.env.HOST || '0.0.0.0', () => {
    console.log(`Eco-Herd API aktif pada port ${port}. Database: ${filename}`);
  });
  const stop = () => server.close(() => { store.close(); process.exit(0); });
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
