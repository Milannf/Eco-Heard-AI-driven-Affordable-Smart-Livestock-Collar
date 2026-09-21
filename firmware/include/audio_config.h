#pragma once

#include <stdint.h>

// INMP441: VDD->3V3, GND->GND, L/R->GND (slot kiri).
constexpr int AUDIO_BCLK_PIN = 26; // SCK pada modul
constexpr int AUDIO_WS_PIN = 25;   // WS / LRCLK
constexpr int AUDIO_SD_PIN = 33;   // SD / DOUT dari mikrofon
constexpr bool AUDIO_USE_RIGHT_CHANNEL = false; // false: L/R->GND; true: L/R->3V3
constexpr uint32_t AUDIO_SAMPLE_RATE_HZ = 16000;
constexpr uint32_t AUDIO_WINDOW_MS = 100;
constexpr uint32_t AUDIO_WINDOW_SAMPLES = AUDIO_SAMPLE_RATE_HZ * AUDIO_WINDOW_MS / 1000;
constexpr uint32_t AUDIO_MAX_AGE_MS = 500;
