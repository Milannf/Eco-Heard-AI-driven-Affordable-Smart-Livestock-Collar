from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import threading
import time
import unittest

from api_bridge import ApiBridge, api_sample
from log_csv import parse_sample

LINE = "DATA,68:09:47:4C:F2:54,190,19425,151,1,33.3125,150,1,-10.7,-39.8,1098.1,-0.078,0.018,0.010"


class BridgeTests(unittest.TestCase):
    def test_mapping_and_invalid_sensor_nulls(self):
        sample = api_sample(parse_sample(LINE), 42)
        self.assertEqual(sample["record_seq"], 42)
        self.assertEqual(sample["uptime_ms"], 19425)
        self.assertEqual(sample["acceleration_mg"]["z"], 1098.1)
        self.assertEqual(sample["gyro_rad_s"]["x"], -0.078)
        invalid = api_sample(parse_sample("DATA,68:09:47:4C:F2:54,1,10,20,0,,,0,,,,,,"), 43)
        for field in ("temperature_c", "temperature_age_ms", "acceleration_mg", "gyro_rad_s"):
            self.assertIsNone(invalid[field])

    def test_retry_keeps_identity_and_acknowledges_duplicates(self):
        requests = []

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def do_POST(self):
                requests.append(json.loads(self.rfile.read(int(self.headers["Content-Length"]))))
                # Simulate commit followed by failed response, then deduplicated retry.
                self.send_response(503 if len(requests) == 1 else 200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"inserted": 0, "duplicates": 1}).encode())

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        bridge = ApiBridge(f"http://127.0.0.1:{server.server_port}", "TEST")
        try:
            started = time.monotonic()
            bridge.submit(parse_sample(LINE))
            self.assertLess(time.monotonic() - started, 0.2)
            deadline = time.monotonic() + 6
            while bridge.acknowledged != 1 and time.monotonic() < deadline:
                time.sleep(0.05)
            self.assertEqual(bridge.acknowledged, 1)
            self.assertGreaterEqual(len(requests), 2)
            self.assertEqual(requests[0]["session_id"], requests[1]["session_id"])
            a, b = requests[0]["samples"][0], requests[1]["samples"][0]
            self.assertGreater(b.pop("queue_age_ms"), a.pop("queue_age_ms"))
            self.assertEqual(a, b)
        finally:
            bridge.close()
            server.shutdown()
            server.server_close()
            thread.join()


if __name__ == "__main__":
    unittest.main()
