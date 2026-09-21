#include <Arduino.h>
#include <driver/i2s.h>
#include <driver/gpio.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include "audio_sensor.h"

namespace {
constexpr i2s_port_t AUDIO_I2S_PORT = I2S_NUM_0;
portMUX_TYPE audioMux = portMUX_INITIALIZER_UNLOCKED;
AudioSnapshot latest;
QueueHandle_t i2sEvents = nullptr;

struct AudioDiagnostics {
  bool started = false;
  uint32_t reads = 0;
  uint32_t errors = 0;
  uint32_t overflows = 0;
  uint32_t windows = 0;
  uint32_t validWindows = 0;
  uint32_t lastBytes = 0;
  esp_err_t lastError = ESP_OK;
  int32_t leftMin = 0;
  int32_t leftMax = 0;
  int32_t rightMin = 0;
  int32_t rightMax = 0;
};
AudioDiagnostics diagnostics;

int32_t pcm24(int32_t slot) {
  uint32_t word = static_cast<uint32_t>(slot) >> 8;
  return (word & 0x800000) ? int32_t(word) - 0x1000000 : int32_t(word);
}

void publishAudio(const AudioMetrics& levels) {
  uint32_t now = millis();
  portENTER_CRITICAL(&audioMux);
  latest.levels = levels;
  latest.updatedAt = now;
  portEXIT_CRITICAL(&audioMux);
}

void audioTask(void*) {
  // Stereo memastikan dua slot 32-bit (64 BCLK/frame) dan memungkinkan
  // diagnosis slot lawan tanpa mencampurkannya ke perhitungan RMS.
  int32_t samples[512]; // 256 frame: left, right untuk I2S 32-bit ESP32
  AudioDiagnostics counters;
  counters.started = true;
  AudioWindow window;
  // Buang 200 ms pertama untuk settling startup mikrofon.
  uint32_t settling = AUDIO_SAMPLE_RATE_HZ / 5;
  for (;;) {
    i2s_event_t event;
    bool overflow = false;
    while (xQueueReceive(i2sEvents, &event, 0) == pdTRUE) {
      if (event.type == I2S_EVENT_RX_Q_OVF || event.type == I2S_EVENT_DMA_ERROR) overflow = true;
    }
    if (overflow) {
      counters.overflows++;
      window = AudioWindow{};
      publishAudio(AudioMetrics{});
      // Buang backlog DMA sebelum merangkum jendela baru.
      settling = AUDIO_SAMPLE_RATE_HZ / 5;
    }
    size_t bytesRead = 0;
    esp_err_t result = i2s_read(AUDIO_I2S_PORT, samples, sizeof(samples), &bytesRead, pdMS_TO_TICKS(50));
    counters.reads++;
    counters.lastBytes = bytesRead;
    counters.lastError = result;
    if (result != ESP_OK || bytesRead == 0 || bytesRead % (2 * sizeof(int32_t)) != 0) {
      counters.errors++;
      window = AudioWindow{};
      publishAudio(AudioMetrics{});
      portENTER_CRITICAL(&audioMux);
      diagnostics = counters;
      portEXIT_CRITICAL(&audioMux);
      vTaskDelay(pdMS_TO_TICKS(5));
      continue;
    }
    counters.leftMin = counters.rightMin = INT32_MAX;
    counters.leftMax = counters.rightMax = INT32_MIN;
    for (size_t i = 0; i < bytesRead / sizeof(int32_t); i += 2) {
      int32_t left = pcm24(samples[i]);
      int32_t right = pcm24(samples[i + 1]);
      counters.leftMin = min(counters.leftMin, left);
      counters.leftMax = max(counters.leftMax, left);
      counters.rightMin = min(counters.rightMin, right);
      counters.rightMax = max(counters.rightMax, right);
      if (settling) { settling--; continue; }
      window.add(samples[i + (AUDIO_USE_RIGHT_CHANNEL ? 1 : 0)]);
      if (window.size() == AUDIO_WINDOW_SAMPLES) {
        AudioMetrics levels = window.finish();
        counters.windows++;
        if (levels.valid) counters.validWindows++;
        publishAudio(levels);
        window = AudioWindow{};
      }
    }
    portENTER_CRITICAL(&audioMux);
    diagnostics = counters;
    portEXIT_CRITICAL(&audioMux);
  }
}
}

bool setupAudioSensor() {
  i2s_config_t config = {};
  config.mode = i2s_mode_t(I2S_MODE_MASTER | I2S_MODE_RX);
  config.sample_rate = AUDIO_SAMPLE_RATE_HZ;
  config.bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT;
  config.channel_format = I2S_CHANNEL_FMT_RIGHT_LEFT;
  config.communication_format = I2S_COMM_FORMAT_STAND_I2S;
  config.intr_alloc_flags = ESP_INTR_FLAG_LEVEL1;
  config.dma_buf_count = 6;
  config.dma_buf_len = 256;
  config.use_apll = false;

  esp_err_t result = i2s_driver_install(AUDIO_I2S_PORT, &config, 16, &i2sEvents);
  if (result != ESP_OK) {
    Serial.printf("[Audio] i2s_driver_install gagal: %s\n", esp_err_to_name(result));
    return false;
  }
  i2s_pin_config_t pins = {};
  pins.mck_io_num = I2S_PIN_NO_CHANGE;
  pins.bck_io_num = AUDIO_BCLK_PIN;
  pins.ws_io_num = AUDIO_WS_PIN;
  pins.data_out_num = I2S_PIN_NO_CHANGE;
  pins.data_in_num = AUDIO_SD_PIN;
  result = i2s_set_pin(AUDIO_I2S_PORT, &pins);
  if (result != ESP_OK) {
    Serial.printf("[Audio] i2s_set_pin gagal: %s\n", esp_err_to_name(result));
    i2s_driver_uninstall(AUDIO_I2S_PORT);
    return false;
  }
  gpio_set_pull_mode(gpio_num_t(AUDIO_SD_PIN), GPIO_PULLDOWN_ONLY);
  if (xTaskCreate(audioTask, "inmp441", 6144, nullptr, 2, nullptr) != pdPASS) {
    Serial.println("[Audio] Gagal membuat task pembaca mikrofon.");
    i2s_driver_uninstall(AUDIO_I2S_PORT);
    return false;
  }
  Serial.printf("[Audio] I2S stereo 32-bit, pakai %s, %lu Hz, jendela %lu ms.\n",
    AUDIO_USE_RIGHT_CHANNEL ? "kanan" : "kiri",
    (unsigned long)AUDIO_SAMPLE_RATE_HZ, (unsigned long)AUDIO_WINDOW_MS);
  Serial.printf("[Audio] Wiring SCK=%d WS=%d SD=%d; L/R harus ke %s.\n",
    AUDIO_BCLK_PIN, AUDIO_WS_PIN, AUDIO_SD_PIN, AUDIO_USE_RIGHT_CHANNEL ? "3V3" : "GND");
  return true;
}

AudioSnapshot readAudioSnapshot() {
  portENTER_CRITICAL(&audioMux);
  AudioSnapshot snapshot = latest;
  portEXIT_CRITICAL(&audioMux);
  snapshot.ageMs = millis() - snapshot.updatedAt;
  if (snapshot.ageMs > AUDIO_MAX_AGE_MS) snapshot.levels.valid = false;
  if (!snapshot.levels.valid) snapshot.ageMs = UINT32_MAX;
  return snapshot;
}

void printAudioDiagnostics() {
  // Dipanggil dari loop setiap 2 detik, bukan dari task pembaca DMA.
  portENTER_CRITICAL(&audioMux);
  AudioDiagnostics info = diagnostics;
  uint32_t updatedAt = latest.updatedAt;
  portEXIT_CRITICAL(&audioMux);
  if (!info.started) {
    Serial.println("[Audio diag] Task I2S belum membaca data; periksa log startup [Audio].");
    return;
  }
  Serial.printf("[Audio diag] baca=%lu error=%lu overflow=%lu bytes=%lu status=%s window=%lu valid=%lu umur=%lu ms\n",
    (unsigned long)info.reads, (unsigned long)info.errors, (unsigned long)info.overflows,
    (unsigned long)info.lastBytes, esp_err_to_name(info.lastError),
    (unsigned long)info.windows, (unsigned long)info.validWindows, (unsigned long)(millis() - updatedAt));
  Serial.printf("[Audio diag] PCM24 blok terakhir: L=[%ld,%ld] R=[%ld,%ld] pilih=%s\n",
    (long)info.leftMin, (long)info.leftMax, (long)info.rightMin, (long)info.rightMax,
    AUDIO_USE_RIGHT_CHANNEL ? "R" : "L");
}
