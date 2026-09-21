"""Non-blocking USB-to-Eco-Herd API bridge; CSV remains the local archive."""
import hashlib
import json
import queue
import socket
import threading
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import uuid


def api_sample(values, record_seq):
    temperature_ok, motion_ok = values[4] == "1", values[7] == "1"
    return {
        "device_id": values[0], "record_seq": record_seq,
        "seq": int(values[1]), "uptime_ms": int(values[2]),
        "temperature_valid": temperature_ok, "motion_valid": motion_ok,
        "temperature_c": float(values[5]) if temperature_ok else None,
        "temperature_age_ms": int(values[6]) if temperature_ok else None,
        "acceleration_mg": dict(zip("xyz", map(float, values[8:11]))) if motion_ok else None,
        "gyro_rad_s": dict(zip("xyz", map(float, values[11:14]))) if motion_ok else None,
    }


class ApiBridge:
    def __init__(self, base_url, port):
        self.url = base_url.rstrip("/") + "/api/telemetry/batch"
        # Locally administered virtual gateway ID, NOT the physical ESP32-B MAC.
        digest = hashlib.sha256(f"{socket.gethostname()}:{port}".encode()).digest()
        self.gateway_id = "02:" + ":".join(f"{b:02X}" for b in digest[:5])
        self.session_id = uuid.uuid4().hex
        self.pending = queue.Queue(maxsize=3000)
        self.stop = threading.Event()
        self.record_seq = self.acknowledged = self.failed = 0
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()

    def submit(self, values):
        self.record_seq += 1
        try:
            self.pending.put_nowait((api_sample(values, self.record_seq), time.monotonic()))
        except queue.Full:
            self.failed += 1
            if self.failed == 1 or self.failed % 100 == 0:
                print("[API] Antrean penuh; sampel tetap tersimpan di CSV.", flush=True)

    def _run(self):
        batch = []
        last_error = -float("inf")
        while not self.stop.is_set():
            if not batch:
                try:
                    batch.append(self.pending.get(timeout=0.2))
                except queue.Empty:
                    continue
                deadline = time.monotonic() + 0.5
                while len(batch) < 10 and time.monotonic() < deadline:
                    try:
                        batch.append(self.pending.get(timeout=max(0.001, deadline - time.monotonic())))
                    except queue.Empty:
                        break
            body = {"version": 1, "gateway_id": self.gateway_id, "session_id": self.session_id,
                    "samples": [{**sample, "queue_age_ms": min(0xFFFFFFFF, max(0, int((time.monotonic() - received) * 1000)))}
                                for sample, received in batch]}
            request = Request(self.url, data=json.dumps(body, allow_nan=False).encode(),
                              headers={"Content-Type": "application/json"}, method="POST")
            try:
                with urlopen(request, timeout=3) as response:
                    reply = json.load(response)
                    if (response.status != 200 or not isinstance(reply, dict)
                            or not isinstance(reply.get("inserted"), int)
                            or not isinstance(reply.get("duplicates"), int)
                            or reply["inserted"] + reply["duplicates"] != len(batch)):
                        raise ValueError("Respons bukan pengakuan batch Eco-Herd")
                self.acknowledged += len(batch)
                batch = []
            except (HTTPError, URLError, OSError, ValueError) as exc:
                if isinstance(exc, HTTPError) and exc.code in (400, 413, 422):
                    self.failed += len(batch)
                    batch = []
                    print(f"[API] Batch ditolak ({exc.code}); data tetap di CSV.", flush=True)
                else:
                    if time.monotonic() - last_error > 5:
                        print(f"[API] Belum tersambung: {exc}. Retry otomatis; CSV tetap berjalan.", flush=True)
                        last_error = time.monotonic()
                    self.stop.wait(2)
        # Record IDs/session remain identical across retries, preventing duplicates.

    def status(self):
        return f"API diakui={self.acknowledged} | tertunda={self.record_seq - self.acknowledged - self.failed} | hanya CSV={self.failed}"

    def close(self):
        deadline = time.monotonic() + 4
        while self.acknowledged + self.failed < self.record_seq and time.monotonic() < deadline:
            time.sleep(0.1)
        self.stop.set()
        self.thread.join(timeout=5)
        print("[API] " + self.status(), flush=True)
        if self.acknowledged < self.record_seq:
            print("[API] Data belum diakui tetap ada di CSV; antrean RAM tidak dilanjutkan setelah logger ditutup.", flush=True)
