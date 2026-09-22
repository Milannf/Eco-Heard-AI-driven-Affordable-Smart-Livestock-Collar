"""Generate synthetic Eco-Herd sensor samples without ESP32 hardware."""
import argparse
import csv
import math
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from api_bridge import ApiBridge

FIELDS = [
    "device_id", "seq", "uptime_a_ms", "uptime_b_ms",
    "temperature_valid", "temperature_c", "temperature_age_ms", "motion_valid",
    "ax_mg", "ay_mg", "az_mg", "gx_rad_s", "gy_rad_s", "gz_rad_s",
]


def sample(seq, elapsed_ms, device_id):
    phase = seq / 10.0
    return [
        device_id,
        str(seq),
        str(elapsed_ms),
        str(elapsed_ms),
        "1",
        f"{38.2 + 0.35 * math.sin(phase / 5):.4f}",
        "0",
        "1",
        f"{35 * math.sin(phase):.4f}",
        f"{20 * math.cos(phase / 2):.4f}",
        f"{1000 + 15 * math.sin(phase / 3):.4f}",
        f"{0.04 * math.sin(phase / 2):.5f}",
        f"{0.03 * math.cos(phase / 3):.5f}",
        f"{0.02 * math.sin(phase / 4):.5f}",
    ]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("records/dummy-sensor.csv"))
    parser.add_argument("--seconds", type=float, default=30)
    parser.add_argument("--rate", type=float, default=10, help="Samples per second")
    parser.add_argument("--device-id", default="02:00:00:00:00:01")
    parser.add_argument("--api-url", default="", help="Base API URL, for example http://127.0.0.1:3001")
    args = parser.parse_args()
    if args.seconds <= 0 or not math.isfinite(args.seconds):
        parser.error("--seconds must be greater than zero")
    if args.rate <= 0 or not math.isfinite(args.rate):
        parser.error("--rate must be greater than zero")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    bridge = ApiBridge(args.api_url, "dummy") if args.api_url else None
    interval = 1.0 / args.rate
    start = time.monotonic()
    count = 0
    try:
        with args.output.open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.writer(handle)
            writer.writerow(["received_at_utc", *FIELDS])
            while time.monotonic() - start < args.seconds:
                elapsed_ms = int((time.monotonic() - start) * 1000)
                values = sample(count + 1, elapsed_ms, args.device_id)
                writer.writerow([datetime.now(timezone.utc).isoformat(timespec="milliseconds"), *values])
                handle.flush()
                if bridge:
                    bridge.submit(values)
                count += 1
                time.sleep(max(0, interval - (time.monotonic() - start - count * interval)))
    except KeyboardInterrupt:
        pass
    finally:
        if bridge:
            bridge.close()
    print(f"Generated {count} samples: {args.output.resolve()}", file=sys.stderr)


if __name__ == "__main__":
    main()
