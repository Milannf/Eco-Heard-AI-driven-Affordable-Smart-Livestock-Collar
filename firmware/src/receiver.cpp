// Referensi ESP32-B. Build dengan environment esp32-b.
#include <Arduino.h>
#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <time.h>
#include <math.h>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#if __has_include("gateway_config.h")
#include "gateway_config.h"
#else
#include "gateway_config.example.h"
#endif
#include "sensor_packet.h"
#include "telemetry_uploader.h"

QueueHandle_t packetQueue = nullptr;
bool receiverReady = false;
unsigned long lastPacketAt = 0;
unsigned long lastWiFiAttempt = 0;
bool wifiConnecting = false;
bool wifiConnected = false;
unsigned long lastRxPrint = 0;
uint32_t packetsReceived = 0;
unsigned long lastNetworkPrint = 0;
volatile uint8_t lastDisconnectReason = 0;
bool csvStreaming = false;

void updateSerialMode() {
  static char command[24];
  static size_t length = 0;
  static bool overflow = false;
  for (unsigned i = 0; i < 64 && Serial.available(); i++) {
    const char c = Serial.read();
    if (c == '\r') continue;
    if (c == '\n') {
      command[length] = '\0';
      if (!overflow && strcmp(command, "CSV ON") == 0) {
        csvStreaming = true;
        Serial.println("[CSV] Streaming aktif.");
      } else if (!overflow && strcmp(command, "CSV OFF") == 0) {
        csvStreaming = false;
        Serial.println("[Monitor] Ringkasan sensor setiap 1 detik.");
      }
      length = 0;
      overflow = false;
    } else if (length < sizeof(command) - 1) {
      command[length++] = c;
    } else {
      overflow = true;
    }
  }
}

void onWiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {
  if (event == ARDUINO_EVENT_WIFI_STA_DISCONNECTED) {
    lastDisconnectReason = info.wifi_sta_disconnected.reason;
  }
}

// Signature Arduino-ESP32 2.x, sesuai platform proyek ini.
void onReceive(const uint8_t* senderMac, const uint8_t* data, int length) {
  if (length != sizeof(SensorPacket)) return;
  ReceivedPacket received = {};
  memcpy(&received.sensor, data, sizeof(received.sensor));
  if (received.sensor.magic != SENSOR_PACKET_MAGIC ||
      received.sensor.version != SENSOR_PACKET_VERSION) return;
  memcpy(received.senderMac, senderMac, sizeof(received.senderMac));
  // Callback berjalan di task Wi-Fi. Jangan lakukan HTTP/Serial di sini.
  // Antrean penuh: paket baru dilewati agar task Wi-Fi tidak terblokir.
  xQueueSend(packetQueue, &received, 0);
}

void updateGatewayWiFi() {
  if (GATEWAY_LOCAL_CSV_ONLY) return;
  unsigned long now = millis();
  if (now - lastNetworkPrint >= 5000) {
    lastNetworkPrint = now;
    Serial.printf("[Status B] RX=%lu | Wi-Fi=%d | kanal=%u | putus-terakhir=%u\n",
      (unsigned long)packetsReceived, WiFi.status(), WiFi.channel(), lastDisconnectReason);
  }
  if (GATEWAY_WIFI_SSID[0] == '\0') return;
  if (WiFi.status() == WL_CONNECTED) {
    if (!wifiConnected) {
      if (String(GATEWAY_API_URL).startsWith("https://")) {
        configTime(0, 0, "pool.ntp.org", "time.google.com");
      }
      Serial.printf("[WiFi] B terhubung: IP=%s, kanal=%u\n",
        WiFi.localIP().toString().c_str(), WiFi.channel());
      if (WiFi.channel() != ESPNOW_CHANNEL) {
        Serial.printf("[WiFi] Kanal router berbeda! Atur router ke kanal %u atau ubah ESPNOW_CHANNEL pada A dan B.\n",
          ESPNOW_CHANNEL);
      }
    }
    wifiConnected = true;
    wifiConnecting = false;
    return;
  }

  if (wifiConnected) {
    wifiConnected = false;
    WiFi.disconnect();
    esp_wifi_set_channel(ESPNOW_CHANNEL, WIFI_SECOND_CHAN_NONE);
    Serial.println("[WiFi] Router terputus. B kembali ke kanal ESP-NOW.");
  }
  if (wifiConnecting && now - lastWiFiAttempt >= 20000) {
    Serial.printf("[WiFi] Timeout koneksi. status=%d, reason=%u. Periksa SSID/password dan router 2.4 GHz.\n",
      WiFi.status(), lastDisconnectReason);
    WiFi.disconnect();
    wifiConnecting = false;
    esp_wifi_set_channel(ESPNOW_CHANNEL, WIFI_SECOND_CHAN_NONE);
    Serial.println("[WiFi] Koneksi gagal. Coba lagi setelah jeda.");
  }
  if (!wifiConnecting && now - lastWiFiAttempt >= 30000) {
    lastWiFiAttempt = now;
    wifiConnecting = true;
    Serial.printf("[WiFi] Menghubungkan ke %s pada kanal %u...\n", GATEWAY_WIFI_SSID, ESPNOW_CHANNEL);
    // Petunjuk kanal mengurangi scanning; router harus memakai kanal tetap.
    WiFi.begin(GATEWAY_WIFI_SSID, GATEWAY_WIFI_PASSWORD, ESPNOW_CHANNEL);
  }
}

void setup() {
  Serial.begin(115200);
  packetQueue = xQueueCreate(20, sizeof(ReceivedPacket));
  if (packetQueue == nullptr) {
    Serial.println("[ESP-NOW] Gagal membuat antrean.");
    return;
  }
  if (!WiFi.mode(WIFI_STA)) {
    Serial.println("[WiFi] Gagal mengaktifkan radio Wi-Fi.");
    return;
  }
  WiFi.setSleep(false); // Radio tetap aktif menerima ESP-NOW saat terhubung router.
  WiFi.onEvent(onWiFiEvent);
  WiFi.setAutoReconnect(false); // Retry dikendalikan updateGatewayWiFi().
  WiFi.disconnect();
  if (esp_wifi_set_channel(ESPNOW_CHANNEL, WIFI_SECOND_CHAN_NONE) != ESP_OK ||
      esp_now_init() != ESP_OK ||
      esp_now_register_recv_cb(onReceive) != ESP_OK) {
    Serial.println("[ESP-NOW] Gagal mengaktifkan penerima.");
    return;
  }
  receiverReady = true;
  setupTelemetryUploader();
  if (GATEWAY_LOCAL_CSV_ONLY) Serial.println("[CSV] Mode USB lokal aktif; router dan HTTP dinonaktifkan.");
  Serial.printf("[ESP-NOW] ESP32-B siap menerima, kanal %u.\n", ESPNOW_CHANNEL);
  Serial.println("[Monitor] Ringkasan setiap 1 detik. Logger CSV mengaktifkan streaming otomatis.");
  if (GATEWAY_WIFI_SSID[0] == '\0') Serial.println("[WiFi] SSID kosong; isi include/gateway_config.h untuk upload API.");
  // Memulai percobaan Wi-Fi pertama segera, tanpa memblokir penerimaan.
  lastWiFiAttempt = millis() - 30000UL;
}

// Satu baris utuh per paket, terpisah dari log manusia dengan awalan DATA,.
void printCsvPacket(const ReceivedPacket& received) {
  const auto& p = received.sensor;
  const bool tempOk = (p.flags & SENSOR_TEMPERATURE_VALID) && isfinite(p.temperature_c);
  const bool motionOk = (p.flags & SENSOR_MOTION_VALID) &&
    isfinite(p.x_mg) && isfinite(p.y_mg) && isfinite(p.z_mg) &&
    isfinite(p.gx_rad_s) && isfinite(p.gy_rad_s) && isfinite(p.gz_rad_s);
  String row;
  row.reserve(256);
  char mac[18];
  snprintf(mac, sizeof(mac), "%02X:%02X:%02X:%02X:%02X:%02X",
    received.senderMac[0], received.senderMac[1], received.senderMac[2],
    received.senderMac[3], received.senderMac[4], received.senderMac[5]);
  row = "DATA,";
  row += mac;
  row += ','; row += String(p.seq);
  row += ','; row += String(p.t_ms);
  row += ','; row += String(millis());
  row += tempOk ? ",1," : ",0,";
  if (tempOk) row += String(p.temperature_c, 4);
  row += ',';
  if (tempOk) row += String(p.temperature_age_ms);
  row += motionOk ? ",1" : ",0";
  const float axes[] = {p.x_mg, p.y_mg, p.z_mg, p.gx_rad_s, p.gy_rad_s, p.gz_rad_s};
  for (float axis : axes) {
    row += ',';
    if (motionOk) row += String(axis, 6);
  }
  Serial.println(row);
}

void loop() {
  if (!receiverReady) {
    delay(100);
    return;
  }
  updateGatewayWiFi();
  updateSerialMode();
  ReceivedPacket received;
  if (xQueueReceive(packetQueue, &received, pdMS_TO_TICKS(20)) == pdTRUE) {
    lastPacketAt = millis();
    queueTelemetry(received);
    packetsReceived++;
    if (csvStreaming) {
      printCsvPacket(received);
      return;
    }
    // Semua paket tetap diupload; cetak satu snapshot/detik agar status jaringan terbaca.
    if (millis() - lastRxPrint < 1000) return;
    lastRxPrint = millis();
    const SensorPacket& packet = received.sensor;
    Serial.println("\n------------ ECO-HERD | ESP32-B ------------");
    Serial.printf("Pengirim      : %02X:%02X:%02X:%02X:%02X:%02X\nPaket A       : #%lu | Uptime A: %lu ms\n",
      received.senderMac[0], received.senderMac[1], received.senderMac[2],
      received.senderMac[3], received.senderMac[4], received.senderMac[5],
      (unsigned long)packet.seq, (unsigned long)packet.t_ms);
    Serial.printf("Total diterima: %lu paket\n", (unsigned long)packetsReceived);
    if ((packet.flags & SENSOR_TEMPERATURE_VALID) && isfinite(packet.temperature_c)) {
      Serial.printf("Suhu          : %.2f C | VALID | Umur: %lu ms\n", packet.temperature_c,
        (unsigned long)packet.temperature_age_ms);
    } else {
      Serial.println("Suhu          : TIDAK VALID");
    }
    if ((packet.flags & SENSOR_MOTION_VALID) &&
        isfinite(packet.x_mg) && isfinite(packet.y_mg) && isfinite(packet.z_mg) &&
        isfinite(packet.gx_rad_s) && isfinite(packet.gy_rad_s) && isfinite(packet.gz_rad_s)) {
      Serial.printf("Akselerasi mg : X=%9.1f | Y=%9.1f | Z=%9.1f\nGyro rad/s    : X=%9.3f | Y=%9.3f | Z=%9.3f\n",
        packet.x_mg, packet.y_mg, packet.z_mg,
        packet.gx_rad_s, packet.gy_rad_s, packet.gz_rad_s);
    } else {
      Serial.println("Gerakan       : TIDAK VALID (periksa IMU pada A)");
    }
    Serial.println("-------------------------------------------");
  } else if (millis() - lastPacketAt >= 2000) {
    lastPacketAt = millis();
    Serial.println("[ESP-NOW] Menunggu data ESP32-A...");
  }
}
