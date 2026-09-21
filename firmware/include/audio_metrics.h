#pragma once

#include <cmath>
#include <cstdint>

struct AudioMetrics {
  bool valid = false;
  bool clipped = false;
  float rms = 0;
  float peak = 0;
  float dbfs = -120;
};

// INMP441: signed PCM 24-bit pada 24 bit atas slot I2S 32-bit.
// Header DSP bebas Arduino agar dapat diuji dengan sinyal sintetis pada host.
class AudioWindow {
 public:
  void add(int32_t slot) {
    // Buang 8 bit bawah; gunakan aritmetika eksplisit untuk sign extension.
    uint32_t word = static_cast<uint32_t>(slot) >> 8;
    int32_t pcm = (word & 0x800000) ? int32_t(word) - 0x1000000 : int32_t(word);
    double sample = pcm / 8388608.0;
    sum += sample;
    squares += sample * sample;
    if (sample < minimum) minimum = sample;
    if (sample > maximum) maximum = sample;
    count++;
  }

  uint32_t size() const { return count; }

  AudioMetrics finish() const {
    AudioMetrics result;
    // Data konstan/semua nol dapat terjadi ketika mic lepas atau slot salah.
    // Ini pemeriksaan aliran data, bukan bukti identitas/presensi mikrofon I2S.
    if (count < 2 || minimum == maximum) return result;
    double mean = sum / count;
    double variance = squares / count - mean * mean;
    result.rms = float(std::sqrt(variance > 0 ? variance : 0)); // DC dihilangkan
    result.peak = float(std::fmax(std::fabs(minimum), std::fabs(maximum))); // Peak PCM mentah
    result.dbfs = 20.0f * std::log10(std::fmax(result.rms, 0.000001f));
    result.clipped = result.peak >= 0.999f;
    result.valid = true;
    return result;
  }

 private:
  uint32_t count = 0;
  double sum = 0;
  double squares = 0;
  double minimum = 1;
  double maximum = -1;
};
