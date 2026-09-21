from copy import deepcopy
from datetime import datetime, timedelta, timezone
import math
import os
import unittest

import numpy as np

from features import WindowError, extract_features


def samples():
    now = datetime.now(timezone.utc)
    return [{
        "id": i + 1, "device_id": "00:11:22:33:44:55", "gateway_id": "AA:BB:CC:DD:EE:FF",
        "cow_id": "test-cow", "session_id": "test-session", "seq": i + 1, "uptime_ms": 1000 + i * 100,
        "observed_at": (now - timedelta(milliseconds=(99 - i) * 100)).isoformat(),
        "motion_valid": True, "temperature_valid": True, "temperature_age_ms": 50,
        "temperature_c": 37.0, "acceleration_mg": {"x": 0.0, "y": 0.0, "z": 1000.0},
    } for i in range(100)]


class FeatureTests(unittest.TestCase):
    def assert_status(self, rows, status):
        with self.assertRaises(WindowError) as result:
            extract_features(rows)
        self.assertEqual(result.exception.status, status)

    def test_stationary_gravity_and_temperature(self):
        result, window = extract_features(samples())
        self.assertEqual(len(result), 37)
        self.assertEqual(result["mag_mean"], 1000)
        self.assertEqual(result["az_energy"], 1_000_000)
        self.assertEqual(result["temp_mean"], 37)
        for key in ("mag_std", "temp_std", "jerk_mean", "spectral_energy", "spectral_entropy", "corr_ax_ay"):
            self.assertEqual(result[key], 0)
        self.assertAlmostEqual(result["mean_fs_hz"], 10)
        self.assertAlmostEqual(window["duration_s"], 9.9)

    def test_one_hz_sinusoid_has_expected_fft_and_energy(self):
        rows = samples()
        for i, row in enumerate(rows):
            row["acceleration_mg"]["z"] = 1000 + 100 * math.sin(2 * math.pi * i / 10)
        result, _ = extract_features(rows)
        self.assertAlmostEqual(result["mag_std"], math.sqrt(5000), places=6)
        self.assertAlmostEqual(result["az_energy"], 1_005_000, places=6)
        self.assertAlmostEqual(result["dom_freq_hz"], 1)
        self.assertAlmostEqual(result["dom_freq_power"], 25_000_000, places=4)
        self.assertAlmostEqual(result["spectral_entropy"], 0, places=6)

    def test_correlation_and_centered_crossings(self):
        rows = samples()
        for i, row in enumerate(rows):
            row["acceleration_mg"] = {"x": (-1)**i, "y": 2 * (-1)**i, "z": -(-1)**i}
        result, _ = extract_features(rows)
        self.assertEqual(result["ax_zcr"], 1)
        self.assertAlmostEqual(result["corr_ax_ay"], 1)
        self.assertAlmostEqual(result["corr_ax_az"], -1)

    def test_uint32_wrap_is_contiguous(self):
        rows = samples()
        for i, row in enumerate(rows):
            row["uptime_ms"] = (2**32 - 5000 + i * 100) % 2**32
            row["seq"] = (2**32 - 50 + i) % 2**32
        result, _ = extract_features(rows)
        self.assertAlmostEqual(result["mean_fs_hz"], 10)

    def test_incomplete_stale_reset_gaps_and_invalid_values(self):
        self.assert_status(samples()[:99], "waiting")
        cases = [
            (50, {"seq": 999}, "data_gap"),
            (50, {"uptime_ms": 0}, "data_gap"),
            (50, {"session_id": "other-session"}, "waiting"),
            (50, {"device_id": "another-collar"}, "waiting"),
            (50, {"cow_id": "another-cow"}, "waiting"),
            (50, {"motion_valid": False, "acceleration_mg": None}, "invalid_sensor"),
            (50, {"temperature_valid": False, "temperature_c": None}, "invalid_sensor"),
            (50, {"temperature_c": float("nan")}, "invalid_sensor"),
            (50, {"temperature_age_ms": 6000}, "invalid_sensor"),
            (99, {"observed_at": "2020-01-01T00:00:00Z"}, "stale"),
        ]
        for index, change, expected in cases:
            with self.subTest(change=change):
                rows = samples()
                rows[index].update(change)
                self.assert_status(rows, expected)

    @unittest.skipUnless(os.getenv("AI_MODEL_DIR"), "Set AI_MODEL_DIR untuk uji model asli.")
    def test_real_model_probabilities_and_feature_order(self):
        from worker import BehaviourModel
        model = BehaviourModel(os.environ["AI_MODEL_DIR"])
        rows = samples()
        result = model.predict(rows)
        self.assertEqual(result["status"], "experimental")
        self.assertFalse(result["metadata"]["preprocessing_verified"])
        probabilities = result["prediction"]["probabilities"]
        self.assertAlmostEqual(sum(p["probability"] for p in probabilities), 1)
        features, _ = extract_features(rows)
        x = np.array([[features[name] for name in model.columns]])
        expected = model.model.predict_proba(x, num_threads=1)[0]
        np.testing.assert_allclose([p["probability"] for p in probabilities], expected)
        self.assertEqual(result["prediction"]["class_id"], model.classes[int(np.argmax(expected))])
        if result["metadata"]["label_issue"]:
            self.assertIsNone(result["prediction"]["label"])


if __name__ == "__main__":
    unittest.main()
