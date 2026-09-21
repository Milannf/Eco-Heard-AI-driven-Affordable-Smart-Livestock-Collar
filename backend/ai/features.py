"""Extractor PROTOTIPE, bukan kode preprocessing asli pelatihan.

Kontrak dan rumus tercatat pada INTEGRASI_AI.md. Jangan menyebut prediksinya
tervalidasi sebelum dibandingkan dengan fitur dari notebook pembuat model.
"""
from datetime import datetime, timezone

import numpy as np

WINDOW_SAMPLES = 100
SAMPLE_RATE_HZ = 10.0
PROFILE = "prototype-mg-10hz-100samples-v1"


class WindowError(ValueError):
    def __init__(self, status, message):
        self.status = status
        super().__init__(message)


def extract_features(rows, now=None):
    """rows: urutan kronologis dari database backend, bukan urutan HTTP arrival."""
    if len(rows) < WINDOW_SAMPLES:
        raise WindowError("waiting", f"Menunggu {WINDOW_SAMPLES} sampel; tersedia {len(rows)}.")
    rows = rows[-WINDOW_SAMPLES:]
    latest = rows[-1]
    now = now or datetime.now(timezone.utc)
    age = (now - datetime.fromisoformat(latest["observed_at"].replace("Z", "+00:00"))).total_seconds()
    if age > 15 or age < -5:
        raise WindowError("stale", "Data terakhir sudah lama atau timestamp tidak sesuai.")
    identity = ("device_id", "gateway_id", "session_id", "cow_id")
    if any(tuple(r.get(k) for k in identity) != tuple(latest.get(k) for k in identity) for r in rows):
        raise WindowError("waiting", "Menunggu window baru setelah pergantian sesi/collar/sapi.")
    if any(not r["motion_valid"] or not r["temperature_valid"] for r in rows):
        raise WindowError("invalid_sensor", "Window mengandung gerakan atau suhu invalid.")
    if any(r["temperature_age_ms"] > 5000 for r in rows):
        raise WindowError("invalid_sensor", "Window mengandung pembacaan suhu kedaluwarsa.")

    # Uptime dan seq berasal dari A. Modulo menangani wrap uint32; reset/gap ditolak.
    dt = np.array([(b["uptime_ms"] - a["uptime_ms"]) % 2**32 / 1000
                   for a, b in zip(rows, rows[1:])], dtype=float)
    seq = [(b["seq"] - a["seq"]) % 2**32 for a, b in zip(rows, rows[1:])]
    if any(s != 1 for s in seq) or np.any(dt < 0.05) or np.any(dt > 0.2):
        raise WindowError("data_gap", "Paket hilang/duplikat, reset sensor, atau interval bukan sekitar 100 ms.")
    fs = float(1 / np.mean(dt))
    if not 8 <= fs <= 12:
        raise WindowError("data_gap", "Sampling tidak sesuai profil prototipe 10 Hz.")

    xyz = np.array([[r["acceleration_mg"][axis] for axis in ("x", "y", "z")] for r in rows], dtype=float)
    temperatures = np.array([r["temperature_c"] for r in rows], dtype=float)
    if not np.isfinite(xyz).all() or not np.isfinite(temperatures).all():
        raise WindowError("invalid_sensor", "Nilai sensor bukan angka finite.")
    if np.any(np.abs(xyz) > 8100) or np.any(temperatures < -55) or np.any(temperatures > 125):
        raise WindowError("invalid_sensor", "Nilai di luar rentang sensor.")

    magnitude = np.linalg.norm(xyz, axis=1)
    features = {}
    for name, values in zip(("ax", "ay", "az", "mag"), (*xyz.T, magnitude)):
        features.update({
            f"{name}_mean": float(np.mean(values)),
            f"{name}_std": float(np.std(values, ddof=0)),
            f"{name}_min": float(np.min(values)),
            f"{name}_max": float(np.max(values)),
            f"{name}_energy": float(np.mean(values**2)),
        })
    features["sma"] = float(np.mean(np.sum(np.abs(xyz), axis=1)))
    features["n_samples"] = len(rows)
    features["mean_fs_hz"] = fs
    jerk = np.linalg.norm(np.diff(xyz, axis=0) / dt[:, None], axis=1)
    features["jerk_mean"] = float(np.mean(jerk))
    features["jerk_std"] = float(np.std(jerk, ddof=0))
    for name, values in zip(("ax", "ay", "az"), xyz.T):
        # ZCR setelah centering, dibagi N-1. Tidak menggunakan skala raw IMU.
        features[f"{name}_zcr"] = float(np.mean(np.diff(np.signbit(values - values.mean()))))
    for i, j, name in ((0, 1, "corr_ax_ay"), (0, 2, "corr_ax_az"), (1, 2, "corr_ay_az")):
        a, b = xyz[:, i] - xyz[:, i].mean(), xyz[:, j] - xyz[:, j].mean()
        denominator = np.linalg.norm(a) * np.linalg.norm(b)
        features[name] = float(np.clip(np.dot(a, b) / denominator, -1, 1)) if denominator > 0 else 0.0

    # Resampling linear magnitude ke grid seragam sebelum FFT. DC dibuang;
    # tanpa taper, tanpa normalisasi FFT, dan tanpa penggandaan spektrum satu sisi.
    times = np.r_[0.0, np.cumsum(dt)]
    uniform = np.interp(np.linspace(0, times[-1], len(rows)), times, magnitude)
    power = np.abs(np.fft.rfft(uniform - uniform.mean()))**2
    power[0] = 0
    total = float(power.sum())
    peak = int(np.argmax(power))
    frequencies = np.fft.rfftfreq(len(rows), d=1 / fs)
    distribution = power[power > 0] / total if total > 0 else np.array([])
    features.update({
        "dom_freq_hz": float(frequencies[peak]) if total > 0 else 0.0,
        "dom_freq_power": float(power[peak]),
        "spectral_energy": total,
        "spectral_entropy": float(-np.sum(distribution * np.log2(distribution))),
        "temp_mean": float(temperatures.mean()),
        "temp_std": float(temperatures.std(ddof=0)),
    })
    if not np.isfinite(list(features.values())).all():
        raise WindowError("invalid_sensor", "Perhitungan fitur menghasilkan nilai non-finite.")
    return features, {
        "samples": len(rows), "mean_fs_hz": fs,
        "duration_s": float(times[-1]), "start_reading_id": rows[0]["id"],
        "end_reading_id": latest["id"], "observed_at": latest["observed_at"],
        "device_id": latest["device_id"], "cow_id": latest.get("cow_id"),
        "temperature_mean_c": features["temp_mean"],
    }
