"""Record ESP32-B DATA lines to a new Excel-compatible CSV (no Wi-Fi needed)."""
import argparse
import csv
from datetime import datetime, timezone
import math
from pathlib import Path
import re
import time
from urllib.parse import urlparse
from api_bridge import ApiBridge

FIELDS = [
    "device_id", "seq", "uptime_a_ms", "uptime_b_ms",
    "temperature_valid", "temperature_c", "temperature_age_ms", "motion_valid",
    "ax_mg", "ay_mg", "az_mg", "gx_rad_s", "gy_rad_s", "gz_rad_s",
]


def parse_sample(line):
    if not line.startswith("DATA,"):
        return None
    values = next(csv.reader([line]))[1:]
    if len(values) != len(FIELDS):
        raise ValueError("Jumlah kolom DATA salah")
    if not re.fullmatch(r"(?:[0-9A-F]{2}:){5}[0-9A-F]{2}", values[0]):
        raise ValueError("MAC tidak valid")
    for index in (1, 2, 3):
        if not values[index].isdigit() or not 0 <= int(values[index]) <= 0xFFFFFFFF:
            raise ValueError("Counter tidak valid")
    if values[4] not in ("0", "1") or values[7] not in ("0", "1"):
        raise ValueError("Flag tidak valid")
    if values[4] == "1":
        if not math.isfinite(float(values[5])) or not -55 <= float(values[5]) <= 125:
            raise ValueError("Suhu tidak valid")
        if not values[6].isdigit() or not 0 <= int(values[6]) <= 0xFFFFFFFF:
            raise ValueError("Umur suhu tidak valid")
    elif values[5:7] != ["", ""]:
        raise ValueError("Suhu invalid harus kosong")
    if values[7] == "1":
        if not all(math.isfinite(float(value)) for value in values[8:]):
            raise ValueError("Gerakan tidak valid")
    elif any(values[8:]):
        raise ValueError("Gerakan invalid harus kosong")
    return values


def main():
    import serial

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", default="COM7")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--api-url", default="", help="Contoh http://127.0.0.1:3001; kosong = CSV saja")
    parser.add_argument("--seconds", type=float, default=0, help="0 = sampai Ctrl+C")
    args = parser.parse_args()
    if args.seconds < 0 or not math.isfinite(args.seconds):
        parser.error("--seconds harus angka >= 0")
    if args.api_url:
        url = urlparse(args.api_url)
        if url.scheme not in ("http", "https") or not url.netloc or url.path not in ("", "/") or url.query or url.fragment:
            parser.error("--api-url harus alamat dasar HTTP(S), tanpa /api atau query")
    output = args.output or Path("records") / datetime.now().strftime("eco-herd_%Y%m%d_%H%M%S_%f.csv")
    port = serial.Serial()
    port.port, port.baudrate, port.timeout = args.port, 115200, 1
    port.dtr = port.rts = False
    count = rejected = 0
    bridge = None
    try:
        port.open()
        port.reset_input_buffer()
        # Abaikan sisa baris yang mungkin mulai sebelum logger terhubung.
        port.readline()
        output.parent.mkdir(parents=True, exist_ok=True)
        with output.open("x", encoding="utf-8-sig", newline="") as handle:
            writer = csv.writer(handle)
            writer.writerow(["received_at_utc", *FIELDS])
            handle.flush()
            if args.api_url:
                bridge = ApiBridge(args.api_url, args.port)
                print(f"[API] USB bridge -> {bridge.url} | gateway virtual={bridge.gateway_id}", flush=True)
            port.write(b"\nCSV ON\n")
            port.flush()
            print(f"Merekam {args.port} -> {output.resolve()} (Ctrl+C untuk berhenti)", flush=True)
            start = last_status = time.monotonic()
            pending = b""
            try:
                while not args.seconds or time.monotonic() - start < args.seconds:
                    pending += port.read_until(b"\n", 1024)
                    if len(pending) > 4096:
                        pending = b""
                        rejected += 1
                        continue
                    if pending.endswith(b"\n"):
                        line = pending.decode("utf-8", "replace").strip()
                        pending = b""
                        try:
                            sample = parse_sample(line)
                        except (ValueError, csv.Error):
                            rejected += 1
                            sample = None
                        if sample is not None:
                            writer.writerow([datetime.now(timezone.utc).isoformat(timespec="milliseconds"), *sample])
                            handle.flush()
                            count += 1
                            if bridge:
                                bridge.submit(sample)
                        elif line.startswith("["):
                            print(line, flush=True)
                            if line.startswith("[ESP-NOW] ESP32-B siap menerima"):
                                port.write(b"\nCSV ON\n")
                    if time.monotonic() - last_status >= 5:
                        print(f"Tersimpan={count} | baris rusak={rejected}", flush=True)
                        if bridge:
                            print("[API] " + bridge.status(), flush=True)
                        last_status = time.monotonic()
            except KeyboardInterrupt:
                pass
        print(f"Selesai: {count} sampel, {rejected} baris rusak. File: {output.resolve()}")
        if not count:
            print("Belum ada data sensor. Pastikan A menyala dan kanal A/B sama.")
    except (serial.SerialException, OSError) as exc:
        parser.exit(1, f"Gagal: {exc}\nTutup Serial Monitor sebelum menjalankan logger.\n")
    finally:
        if port.is_open:
            try:
                port.write(b"\nCSV OFF\n")
                port.flush()
            except (serial.SerialException, OSError):
                pass
        port.close()
        if bridge:
            bridge.close()


if __name__ == "__main__":
    main()
