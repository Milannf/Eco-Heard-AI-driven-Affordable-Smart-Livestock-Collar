import unittest

from log_csv import parse_sample


class CsvProtocolTests(unittest.TestCase):
    def test_valid_sample_preserves_units_and_counters(self):
        values = parse_sample("DATA,68:09:47:4C:F2:54,17,1700,1800,1,31.25,250,1,-10,0,1000,0.001,-0.002,0.003")
        self.assertEqual(values[1:4], ["17", "1700", "1800"])
        self.assertEqual(values[8:11], ["-10", "0", "1000"])

    def test_invalid_sensors_remain_blank(self):
        values = parse_sample("DATA,68:09:47:4C:F2:54,1,10,20,0,,,0,,,,,,")
        self.assertEqual(values[5:7], ["", ""])
        self.assertEqual(values[8:], [""] * 6)

    def test_status_is_not_a_sample(self):
        self.assertIsNone(parse_sample("[ESP-NOW] Menunggu data ESP32-A..."))

    def test_rejects_truncated_nonfinite_and_invalid_flags(self):
        base = "DATA,68:09:47:4C:F2:54,1,10,20,1,25,100,1,0,0,1000,0,0,0"
        for line in [base.rsplit(",", 1)[0], base.replace(",25,", ",nan,"),
                     base.replace(",1000,", ",inf,"), base.replace(",20,1,", ",20,2,"),
                     base.replace(",25,", ",126,"), base.replace(",1,10,", ",-1,10,")]:
            with self.subTest(line=line), self.assertRaises(ValueError):
                parse_sample(line)


if __name__ == "__main__":
    unittest.main()
