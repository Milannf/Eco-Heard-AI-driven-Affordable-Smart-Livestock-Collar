#pragma once

#include "audio_config.h"
#include "audio_metrics.h"

struct AudioSnapshot {
  AudioMetrics levels;
  uint32_t updatedAt = 0;
  uint32_t ageMs = UINT32_MAX;
};

bool setupAudioSensor();
AudioSnapshot readAudioSnapshot();
void printAudioDiagnostics();
