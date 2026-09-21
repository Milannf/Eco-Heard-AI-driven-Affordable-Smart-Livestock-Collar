import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

// Satu worker permanen: joblib dimuat sekali, inferensi tidak memblokir HTTP ingest.
export function createInference({
  python = process.env.AI_PYTHON || fileURLToPath(new URL(
    process.platform === 'win32' ? './.venv/Scripts/python.exe' : './.venv/bin/python', import.meta.url)),
  modelDir = process.env.AI_MODEL_DIR || 'C:/Eco-Herd',
  enabled = process.env.AI_ENABLED !== '0',
} = {}) {
  let child;
  let metadata;
  let state = enabled ? 'loading' : 'disabled';
  let message = enabled ? 'Memuat model Python...' : 'AI dinonaktifkan melalui AI_ENABLED=0.';
  let sequence = 0;
  const pending = new Map();
  let startupTimer;

  function fail(reason) {
    clearTimeout(startupTimer);
    if (state === 'closed') return;
    state = 'model_error';
    message = reason;
    for (const task of pending.values()) {
      clearTimeout(task.timer);
      task.resolve({ status: state, message });
    }
    pending.clear();
  }

  if (enabled) {
    child = spawn(python, ['-u', fileURLToPath(new URL('./ai/worker.py', import.meta.url)), '--model-dir', modelDir], {
      windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });
    startupTimer = setTimeout(() => { fail('Timeout memuat model. Periksa environment Python.'); child.kill(); }, 30000);
    child.on('error', error => fail(`Python tidak dapat dijalankan: ${error.message}. Lihat INTEGRASI_AI.md.`));
    child.on('exit', () => {
      if (state !== 'model_error') fail('Worker Python berhenti. Restart backend setelah memperbaiki konfigurasi.');
    });
    child.stdin.on('error', error => fail(`Koneksi worker gagal: ${error.message}`));
    child.stderr.on('data', chunk => console.error('[AI]', chunk.toString().trim()));
    createInterface({ input: child.stdout }).on('line', line => {
      let result;
      try { result = JSON.parse(line); }
      catch { fail('Respons worker Python bukan JSON.'); child.kill(); return; }
      if (result.event === 'ready') {
        clearTimeout(startupTimer);
        state = 'ready'; metadata = result.metadata; message = 'Model siap untuk inferensi eksperimental.';
        console.log(`[AI] ${metadata.model}: ${metadata.feature_count} fitur. ${metadata.label_issue || 'Label tersedia.'}`);
      } else if (result.event === 'error') {
        fail(result.message);
      } else {
        const task = pending.get(result.id);
        if (!task) return;
        clearTimeout(task.timer);
        pending.delete(result.id);
        task.resolve(result.result);
      }
    });
  }

  return {
    status: () => ({ status: state, message, metadata }),
    predict(readings) {
      if (state !== 'ready') return Promise.resolve({ status: state, message, metadata });
      if (pending.size >= 8) return Promise.resolve({ status: 'busy', message: 'Antrean AI penuh; coba lagi sebentar.' });
      const id = ++sequence;
      return new Promise(resolve => {
        const timer = setTimeout(() => { fail('Inferensi melewati 5 detik. Restart backend.'); child.kill(); }, 5000);
        pending.set(id, { resolve, timer });
        child.stdin.write(JSON.stringify({ id, readings }) + '\n');
      });
    },
    close() {
      fail('Layanan AI ditutup.');
      state = 'closed';
      child?.kill();
    },
  };
}
