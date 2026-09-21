#pragma once

#include <stdint.h>

// A, B, dan router Wi-Fi B harus menggunakan kanal 2.4 GHz yang sama.
// Wi-Fi Tomas saat pemeriksaan memakai kanal 6. Gunakan kanal tetap yang sama.
constexpr uint8_t ESPNOW_CHANNEL = 6;
constexpr uint32_t SENSOR_PACKET_MAGIC = 0x45485244; // EHRD
constexpr uint16_t SENSOR_PACKET_VERSION = 2;
constexpr uint16_t SENSOR_TEMPERATURE_VALID = 1 << 0;
constexpr uint16_t SENSOR_MOTION_VALID = 1 << 1;
constexpr uint16_t SENSOR_AUDIO_VALID = 1 << 2;
constexpr uint16_t SENSOR_AUDIO_CLIPPED = 1 << 3;

// Gunakan header yang sama di kedua ESP32. Tidak kompatibel dengan paket
// 20-byte contoh awal. Nilai sensor invalid dikirim sebagai NAN + flag kosong.
struct SensorPacket {
  uint32_t magic;
  uint16_t version;
  uint16_t flags;
  uint32_t seq;
  uint32_t t_ms; // Uptime A, bukan waktu kalender
  uint32_t temperature_age_ms; // UINT32_MAX bila suhu invalid
  float x_mg;
  float y_mg;
  float z_mg;
  float temperature_c;
  float gx_rad_s;
  float gy_rad_s;
  float gz_rad_s;
  float audio_rms;   // RMS AC relatif full-scale digital, bukan tekanan suara
  float audio_peak;  // Peak PCM mentah relatif full-scale
  float audio_dbfs;  // 20*log10(RMS), floor -120 dBFS, bukan dB SPL
  uint32_t audio_age_ms;
  uint16_t audio_sample_rate_hz;
  uint16_t audio_window_ms;
};

static_assert(sizeof(SensorPacket) == 68, "Format SensorPacket berubah");
static_assert(ESPNOW_CHANNEL >= 1 && ESPNOW_CHANNEL <= 13, "Kanal Wi-Fi tidak valid");
