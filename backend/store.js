import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';

export class InputError extends Error {}

const macPattern = /^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$/;
export function normalizeMac(value) {
  if (typeof value !== 'string' || !macPattern.test(value.toUpperCase())) {
    throw new InputError('device_id/gateway_id harus berupa MAC XX:XX:XX:XX:XX:XX.');
  }
  return value.toUpperCase();
}

function uint32(value, name) {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new InputError(`${name} harus integer uint32.`);
  }
  return value;
}

function number(value, name, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new InputError(`${name} di luar rentang.`);
  }
  return value;
}

function vector(value, name, valid, range) {
  if (!valid) {
    if (value !== null) throw new InputError(`${name} harus null jika invalid.`);
    return null;
  }
  if (!value || typeof value !== 'object') throw new InputError(`${name} wajib diisi.`);
  return Object.fromEntries(['x', 'y', 'z'].map(axis =>
    [axis, number(value[axis], `${name}.${axis}`, -range, range)]));
}

function audioFields(sample) {
  if (typeof sample.audio_valid !== 'boolean') throw new InputError('audio_valid wajib boolean.');
  if (!sample.audio_valid) {
    if (sample.audio !== null) throw new InputError('audio harus null jika invalid.');
    return { audio_valid: false, audio: null };
  }
  const audio = sample.audio;
  if (!audio || typeof audio.clipped !== 'boolean') throw new InputError('audio/clipped wajib diisi.');
  const rms = number(audio.rms, 'audio.rms', 0, 1);
  const peak = number(audio.peak, 'audio.peak', 0, 1);
  const dbfs = number(audio.dbfs, 'audio.dbfs', -120, 0);
  if (rms > peak + 0.000001 || Math.abs(dbfs - 20 * Math.log10(Math.max(rms, 0.000001))) > 0.1) {
    throw new InputError('Level RMS/peak/dBFS tidak konsisten.');
  }
  if (audio.sample_rate_hz !== 16000 || audio.window_ms !== 100) {
    throw new InputError('Audio v2 harus 16000 Hz dengan jendela 100 ms.');
  }
  const age = uint32(audio.age_ms, 'audio.age_ms');
  if (age > 500) throw new InputError('Data audio kedaluwarsa.');
  return {
    audio_valid: true,
    audio: { rms, peak, dbfs, age_ms: age, sample_rate_hz: 16000, window_ms: 100, clipped: audio.clipped },
  };
}

export function validateBatch(body) {
  if (!body || ![1, 2].includes(body.version)) throw new InputError('Versi payload harus 1 atau 2.');
  const gatewayId = normalizeMac(body.gateway_id);
  if (typeof body.session_id !== 'string' || !/^[a-zA-Z0-9-]{8,64}$/.test(body.session_id)) {
    throw new InputError('session_id tidak valid.');
  }
  if (!Array.isArray(body.samples) || !body.samples.length || body.samples.length > 50) {
    throw new InputError('Batch harus berisi 1–50 sampel.');
  }
  const samples = body.samples.map(sample => {
    if (!sample || typeof sample.temperature_valid !== 'boolean' || typeof sample.motion_valid !== 'boolean') {
      throw new InputError('Flag sensor wajib boolean.');
    }
    if (!sample.temperature_valid && (sample.temperature_c !== null || sample.temperature_age_ms !== null)) {
      throw new InputError('Suhu dan umur harus null jika invalid.');
    }
    return {
      device_id: normalizeMac(sample.device_id),
      record_seq: uint32(sample.record_seq, 'record_seq'),
      seq: uint32(sample.seq, 'seq'),
      uptime_ms: uint32(sample.uptime_ms, 'uptime_ms'),
      queue_age_ms: uint32(sample.queue_age_ms, 'queue_age_ms'),
      temperature_valid: sample.temperature_valid,
      motion_valid: sample.motion_valid,
      temperature_c: sample.temperature_valid ? number(sample.temperature_c, 'temperature_c', -55, 125) : null,
      temperature_age_ms: sample.temperature_valid ? uint32(sample.temperature_age_ms, 'temperature_age_ms') : null,
      acceleration_mg: vector(sample.acceleration_mg, 'acceleration_mg', sample.motion_valid, 8100),
      gyro_rad_s: vector(sample.gyro_rad_s, 'gyro_rad_s', sample.motion_valid, 9),
      // Payload v1/record lama tetap valid dan tidak diberi nilai audio buatan.
      ...(body.version === 2 ? audioFields(sample) : {}),
    };
  });
  return { gatewayId, sessionId: body.session_id, samples };
}

export function openStore(filename) {
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS devices (
      device_id TEXT PRIMARY KEY,
      cow_id TEXT,
      cow_name TEXT,
      last_seen TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS readings (
      id INTEGER PRIMARY KEY,
      gateway_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      record_seq INTEGER NOT NULL,
      device_id TEXT NOT NULL REFERENCES devices(device_id),
      cow_id TEXT,
      received_at TEXT NOT NULL,
      observed_at TEXT NOT NULL,
      payload TEXT NOT NULL,
      UNIQUE(gateway_id, session_id, record_seq)
    );
    CREATE INDEX IF NOT EXISTS readings_device ON readings(device_id, id DESC);
    CREATE INDEX IF NOT EXISTS readings_cow ON readings(cow_id, id DESC);
    CREATE TABLE IF NOT EXISTS livestock (
      id TEXT PRIMARY KEY,
      display_id TEXT NOT NULL UNIQUE COLLATE NOCASE,
      breed TEXT NOT NULL DEFAULT '',
      barn TEXT NOT NULL DEFAULT '',
      sex TEXT NOT NULL DEFAULT '',
      weight_kg REAL,
      created_at TEXT NOT NULL
    );
    INSERT OR IGNORE INTO livestock (id, display_id, created_at)
      SELECT cow_id, cow_name, MIN(last_seen) FROM devices
      WHERE cow_id IS NOT NULL AND cow_name IS NOT NULL GROUP BY cow_id;
  `);
  const insertDevice = db.prepare(`INSERT INTO devices(device_id, last_seen) VALUES (?, ?)
    ON CONFLICT(device_id) DO UPDATE SET last_seen=excluded.last_seen`);
  const findDevice = db.prepare('SELECT * FROM devices WHERE device_id=?');
  const insertReading = db.prepare(`INSERT INTO readings
    (gateway_id, session_id, record_seq, device_id, cow_id, received_at, observed_at, payload)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(gateway_id, session_id, record_seq) DO NOTHING`);

  function decode(row) {
    if (!row) return null;
    const { payload, ...metadata } = row;
    return { ...JSON.parse(payload), ...metadata };
  }

  return {
    close: () => db.close(),
    livestock() {
      return db.prepare(`SELECT l.*, (SELECT COUNT(*) FROM readings r WHERE r.cow_id=l.id) AS record_count
        FROM livestock l ORDER BY l.created_at DESC, l.id`).all();
    },
    createLivestock(body) {
      const text = (key, required = false) => {
        const value = body?.[key] ?? '';
        if (typeof value !== 'string' || value.length > 100 || (required && !value.trim())) {
          throw new InputError(`${key} wajib teks valid (maksimum 100 karakter).`);
        }
        return value.trim();
      };
      const displayId = text('display_id', true);
      const breed = text('breed'), barn = text('barn'), sex = text('sex');
      if (!['', 'Betina', 'Jantan'].includes(sex)) throw new InputError('Jenis kelamin tidak valid.');
      const weight = body.weight_kg == null ? null : number(body.weight_kg, 'weight_kg', 1, 3000);
      if (db.prepare('SELECT id FROM livestock WHERE display_id=?').get(displayId)) {
        throw new InputError('ID/nama ternak sudah terdaftar.');
      }
      const id = randomUUID();
      db.prepare('INSERT INTO livestock (id, display_id, breed, barn, sex, weight_kg, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(id, displayId, breed, barn, sex, weight, new Date().toISOString());
      return db.prepare('SELECT * FROM livestock WHERE id=?').get(id);
    },
    deleteLivestock(id) {
      db.exec('BEGIN IMMEDIATE');
      try {
        if (!db.prepare('SELECT id FROM livestock WHERE id=?').get(id)) {
          db.exec('COMMIT');
          return false;
        }
        db.prepare('UPDATE devices SET cow_id=NULL, cow_name=NULL WHERE cow_id=?').run(id);
        db.prepare('UPDATE readings SET cow_id=NULL WHERE cow_id=?').run(id);
        db.prepare('DELETE FROM livestock WHERE id=?').run(id);
        db.exec('COMMIT');
        return true;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    ingest(body) {
      const { gatewayId, sessionId, samples } = validateBatch(body);
      const now = Date.now();
      const receivedAt = new Date(now).toISOString();
      let inserted = 0;
      db.exec('BEGIN IMMEDIATE');
      try {
        for (const sample of samples) {
          // Retry tidak mengubah waktu/data record sebelumnya.
          const existing = db.prepare(`SELECT payload FROM readings
            WHERE gateway_id=? AND session_id=? AND record_seq=?`).get(gatewayId, sessionId, sample.record_seq);
          if (existing) {
            const previous = JSON.parse(existing.payload);
            // queue_age bertambah selama retry; field sensor lain harus identik.
            if (JSON.stringify({ ...previous, queue_age_ms: 0 }) !== JSON.stringify({ ...sample, queue_age_ms: 0 })) {
              throw new InputError('record_seq digunakan ulang untuk sampel berbeda.');
            }
            continue;
          }
          insertDevice.run(sample.device_id, receivedAt);
          const cowId = findDevice.get(sample.device_id).cow_id;
          const observedAt = new Date(now - sample.queue_age_ms).toISOString();
          inserted += Number(insertReading.run(gatewayId, sessionId, sample.record_seq,
            sample.device_id, cowId, receivedAt, observedAt, JSON.stringify(sample)).changes);
        }
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
      return { accepted: samples.length, inserted, duplicates: samples.length - inserted };
    },
    devices() {
      return db.prepare('SELECT * FROM devices ORDER BY device_id').all().map(device => ({
        ...device,
        record_count: db.prepare('SELECT COUNT(*) AS n FROM readings WHERE device_id=?').get(device.device_id).n,
        latest: decode(db.prepare('SELECT * FROM readings WHERE device_id=? ORDER BY id DESC LIMIT 1').get(device.device_id)),
      }));
    },
    assign(deviceId, body) {
      const mac = normalizeMac(deviceId);
      if (!findDevice.get(mac)) throw new InputError('Sensor belum pernah mengirim data.');
      if (typeof body?.cow_id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(body.cow_id) ||
          typeof body.cow_name !== 'string' || !body.cow_name.trim() || body.cow_name.length > 100 ||
          typeof body.include_unassigned !== 'boolean') {
        throw new InputError('cow_id, cow_name, dan include_unassigned wajib diisi dengan benar.');
      }
      db.exec('BEGIN IMMEDIATE');
      try {
        // Pasangan lama/API manual juga menjadi data ternak yang dimasukkan pengguna.
        let cow = db.prepare('SELECT * FROM livestock WHERE id=?').get(body.cow_id);
        if (!cow) {
          if (db.prepare('SELECT id FROM livestock WHERE display_id=?').get(body.cow_name.trim())) {
            throw new InputError('Nama sapi sudah terdaftar dengan ID lain.');
          }
          db.prepare('INSERT INTO livestock (id, display_id, created_at) VALUES (?, ?, ?)')
            .run(body.cow_id, body.cow_name.trim(), new Date().toISOString());
          cow = db.prepare('SELECT * FROM livestock WHERE id=?').get(body.cow_id);
        }
        db.prepare('UPDATE devices SET cow_id=?, cow_name=? WHERE device_id=?')
          .run(body.cow_id, cow.display_id, mac);
        // Pemindahan collar tidak memindahkan riwayat milik sapi sebelumnya.
        if (body.include_unassigned) {
          db.prepare('UPDATE readings SET cow_id=? WHERE device_id=? AND cow_id IS NULL').run(body.cow_id, mac);
        }
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
      return findDevice.get(mac);
    },
    readings({ deviceId, cowId, before, limit = 50 }) {
      if (!deviceId && !cowId) throw new InputError('device_id atau cow_id wajib diisi.');
      const count = Number(limit);
      if (!Number.isInteger(count) || count < 1 || count > 200) throw new InputError('limit harus 1–200.');
      const clauses = [];
      const args = [];
      if (deviceId) { clauses.push('device_id=?'); args.push(normalizeMac(deviceId)); }
      if (cowId) { clauses.push('cow_id=?'); args.push(cowId); }
      if (before) {
        if (!Number.isSafeInteger(Number(before)) || Number(before) < 1) throw new InputError('Cursor tidak valid.');
        clauses.push('id<?'); args.push(Number(before));
      }
      const rows = db.prepare(`SELECT * FROM readings WHERE ${clauses.join(' AND ')} ORDER BY id DESC LIMIT ?`)
        .all(...args, count).map(decode);
      return { readings: rows, next_before: rows.length === count ? rows.at(-1).id : null };
    },
  };
}
