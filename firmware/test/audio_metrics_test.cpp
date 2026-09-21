#include <cassert>
#include <cmath>
#include <iostream>
#include "audio_metrics.h"

int32_t slot(double amplitude) {
  int32_t pcm = int32_t(amplitude * 8388608.0);
  return int32_t(uint32_t(pcm) << 8);
}

int main() {
  AudioWindow empty;
  assert(!empty.finish().valid);
  AudioWindow unplugged;
  AudioWindow dc;
  AudioWindow tone;
  AudioWindow offsetTone;
  const double pi = std::acos(-1.0);
  for (int n = 0; n < 1600; n++) {
    double sample = 0.5 * std::sin(2 * pi * 1000 * n / 16000);
    tone.add(slot(sample));
    offsetTone.add(slot(sample + 0.2));
    unplugged.add(0);
    dc.add(slot(0.2));
  }
  assert(!unplugged.finish().valid);
  assert(!dc.finish().valid);
  auto levels = tone.finish();
  assert(levels.valid && !levels.clipped);
  assert(std::fabs(levels.rms - 0.5 / std::sqrt(2.0)) < 0.000001);
  assert(std::fabs(levels.dbfs - (-9.0309)) < 0.001);
  assert(std::fabs(levels.peak - 0.5) < 0.000001);
  // RMS membuang offset DC, peak mentah tetap menunjukkan headroom ADC.
  assert(std::fabs(offsetTone.finish().rms - levels.rms) < 0.000001);
  assert(std::fabs(offsetTone.finish().peak - 0.7) < 0.000001);
  AudioWindow fullScale;
  fullScale.add(INT32_MIN); // -8388608 dalam slot 32 bit
  fullScale.add(0x7fffff00);
  assert(fullScale.finish().clipped);
  assert(std::fabs(fullScale.finish().rms - 1.0) < 0.000001);
  AudioWindow quiet;
  quiet.add(0x00000100); // +1 LSB pada format 24-bit
  quiet.add(int32_t(0xffffff00u)); // -1 LSB, memverifikasi sign extension
  assert(quiet.finish().valid);
  assert(std::fabs(quiet.finish().rms - 1.0 / 8388608.0) < 1e-12);
  assert(quiet.finish().dbfs == -120);
  std::cout << "PASS: PCM 24-bit, tone RMS/dBFS, DC removal, clipping, silence\n";
}
