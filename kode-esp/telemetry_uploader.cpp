#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <esp_system.h>
#include <math.h>
#include <time.h>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#include <freertos/task.h>
#include "gateway_config.h"
#include "telemetry_uploader.h"

namespace {
constexpr size_t BATCH_SIZE = 10;
constexpr size_t QUEUE_SIZE = 200; // Sekitar 20 detik untuk satu A pada 10 Hz.
struct UploadSample {
  ReceivedPacket received;
  uint32_t recordSeq;
  uint32_t queuedAt;
};
QueueHandle_t uploadQueue = nullptr;
uint32_t recordSequence = 0;
uint32_t dropped = 0;
char sessionId[33];

String macString(const uint8_t* mac) {
  char text[18];
  snprintf(text, sizeof(text), "%02X:%02X:%02X:%02X:%02X:%02X",
    mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  return String(text);
}

String jsonVector(float x, float y, float z) {
  return "{\"x\":" + String(x, 4) + ",\"y\":" + String(y, 4) + ",\"z\":" + String(z, 4) + "}";
}

String batchJson(const UploadSample* batch, size_t count) {
  String body;
  body.reserve(950 * count + 160);
  body = "{\"version\":1,\"gateway_id\":\"" + WiFi.macAddress() +
    "\",\"session_id\":\"" + String(sessionId) + "\",\"samples\":[";
  for (size_t i = 0; i < count; i++) {
    const auto& sample = batch[i];
    const auto& packet = sample.received.sensor;
    bool temperatureOk = (packet.flags & SENSOR_TEMPERATURE_VALID) && isfinite(packet.temperature_c);
    bool motionOk = (packet.flags & SENSOR_MOTION_VALID) &&
      isfinite(packet.x_mg) && isfinite(packet.y_mg) && isfinite(packet.z_mg) &&
      isfinite(packet.gx_rad_s) && isfinite(packet.gy_rad_s) && isfinite(packet.gz_rad_s);
    if (i) body += ',';
    body += "{\"device_id\":\"" + macString(sample.received.senderMac) + "\"";
    body += ",\"record_seq\":" + String(sample.recordSeq);
    body += ",\"seq\":" + String(packet.seq);
    body += ",\"uptime_ms\":" + String(packet.t_ms);
    body += ",\"queue_age_ms\":" + String(uint32_t(millis() - sample.queuedAt));
    body += ",\"temperature_valid\":";
    body += temperatureOk ? "true" : "false";
    body += ",\"motion_valid\":";
    body += motionOk ? "true" : "false";
    body += ",\"temperature_c\":";
    body += temperatureOk ? String(packet.temperature_c, 4) : "null";
    body += ",\"temperature_age_ms\":";
    body += temperatureOk ? String(packet.temperature_age_ms) : "null";
    body += ",\"acceleration_mg\":";
    body += motionOk ? jsonVector(packet.x_mg, packet.y_mg, packet.z_mg) : "null";
    body += ",\"gyro_rad_s\":";
    body += motionOk ? jsonVector(packet.gx_rad_s, packet.gy_rad_s, packet.gz_rad_s) : "null";
    body += '}';
  }
  body += "]}";
  return body;
}

void uploadTask(void*) {
  UploadSample batch[BATCH_SIZE];
  uint32_t lastWiFiNotice = millis() - 5000;
  for (;;) {
    if (xQueueReceive(uploadQueue, &batch[0], portMAX_DELAY) != pdTRUE) continue;
    size_t count = 1;
    uint32_t started = millis();
    while (count < BATCH_SIZE && millis() - started < 1000) {
      if (xQueueReceive(uploadQueue, &batch[count], pdMS_TO_TICKS(100)) == pdTRUE) count++;
    }
    bool finished = false;
    while (!finished) {
      if (WiFi.status() != WL_CONNECTED) {
        if (millis() - lastWiFiNotice >= 5000) {
          lastWiFiNotice = millis();
          Serial.printf("[API] Menunggu Wi-Fi router (status=%d). RX ESP-NOW saja belum berarti internet/LAN terhubung.\n", WiFi.status());
        }
        vTaskDelay(pdMS_TO_TICKS(1000));
        continue;
      }
      // TLS memerlukan jam yang benar untuk memverifikasi masa berlaku CA.
      if (String(GATEWAY_API_URL).startsWith("https://") && time(nullptr) < 1700000000) {
        vTaskDelay(pdMS_TO_TICKS(1000));
        continue;
      }
      WiFiClient plain;
      WiFiClientSecure secure;
      HTTPClient http;
      String body = batchJson(batch, count);
      bool https = String(GATEWAY_API_URL).startsWith("https://");
      if (https) secure.setCACert(GATEWAY_ROOT_CA);
      WiFiClient& client = https ? static_cast<WiFiClient&>(secure) : plain;
      http.setConnectTimeout(3000);
      http.setTimeout(3000);
      int status = -1;
      if (http.begin(client, GATEWAY_API_URL)) {
        http.addHeader("Content-Type", "application/json");
        status = http.POST(body);
      }
      if (status == 200) {
        Serial.printf("[API] Tersimpan/diakui %u sampel (HTTP 200).\n", unsigned(count));
        finished = true;
      } else if (status == 400 || status == 413 || status == 422) {
        Serial.printf("[API] Batch ditolak HTTP %d: %s\n", status, http.getString().c_str());
        finished = true; // Data invalid tidak menahan semua sampel berikutnya.
      } else {
        String reason = status < 0 ? HTTPClient::errorToString(status) : http.getString();
        Serial.printf("[API] Gagal %d (%s). URL=%s | IP B=%s | RSSI=%d dBm. Coba ulang 3 detik.\n",
          status, reason.c_str(), GATEWAY_API_URL, WiFi.localIP().toString().c_str(), WiFi.RSSI());
      }
      http.end();
      if (!finished) vTaskDelay(pdMS_TO_TICKS(3000));
    }
  }
}
}

void setupTelemetryUploader() {
  if (GATEWAY_API_URL[0] == '\0') {
    Serial.println("[API] Upload belum aktif. Isi GATEWAY_API_URL dan Wi-Fi B.");
    return;
  }
  if (GATEWAY_WIFI_SSID[0] == '\0' ||
      (!String(GATEWAY_API_URL).startsWith("http://") && !String(GATEWAY_API_URL).startsWith("https://")) ||
      (String(GATEWAY_API_URL).startsWith("https://") && GATEWAY_ROOT_CA[0] == '\0')) {
    Serial.println("[API] Konfigurasi Wi-Fi/URL/root CA belum lengkap.");
    return;
  }
  uint32_t random[4];
  esp_fill_random(random, sizeof(random));
  snprintf(sessionId, sizeof(sessionId), "%08lx%08lx%08lx%08lx",
    (unsigned long)random[0], (unsigned long)random[1], (unsigned long)random[2], (unsigned long)random[3]);
  uploadQueue = xQueueCreate(QUEUE_SIZE, sizeof(UploadSample));
  if (!uploadQueue) {
    Serial.println("[API] Gagal membuat antrean upload.");
    return;
  }
  if (xTaskCreate(uploadTask, "telemetry-http", 12288, nullptr, 1, nullptr) != pdPASS) {
    vQueueDelete(uploadQueue);
    uploadQueue = nullptr;
    Serial.println("[API] Gagal membuat task upload.");
    return;
  }
  Serial.println("[API] Upload batch aktif, maksimum 10 sampel per permintaan.");
  Serial.printf("[API] Tujuan: %s\n", GATEWAY_API_URL);
}

void queueTelemetry(const ReceivedPacket& packet) {
  if (!uploadQueue) return;
  UploadSample sample = {packet, ++recordSequence, uint32_t(millis())};
  if (xQueueSend(uploadQueue, &sample, 0) != pdTRUE) {
    dropped++;
    if (dropped == 1 || dropped % 100 == 0) {
      Serial.printf("[API] Antrean penuh, total sampel dilewati=%lu.\n", (unsigned long)dropped);
    }
  }
}
