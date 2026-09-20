#include <Wire.h>
#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <WebServer.h>
#include <math.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_Sensor.h>
#include "dashboard.h"
#include "sensor_packet.h"

#define ONE_WIRE_BUS 4

// Jaringan Wi-Fi yang dipancarkan ESP32. Password minimal 8 karakter.
const char* AP_SSID = "Eco-Herd-ESP32";
const char* AP_PASSWORD = "ecoherd123";

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature ds18b20(&oneWire);
WebServer server(80);

const unsigned long SENSOR_INTERVAL_MS = 1000;
const unsigned long MOTION_INTERVAL_MS = 100;
const unsigned long SEND_INTERVAL_MS = 100;
const unsigned long TEMPERATURE_CONVERSION_MS = 750; // DS18B20 12-bit
const uint8_t MPU_ADDRESS = 0x68; // AD0 dihubungkan ke GND
const uint8_t BROADCAST_MAC[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
bool espNowReady = false;
uint32_t packetSequence = 0;
uint32_t packetsQueued = 0;
uint32_t packetQueueErrors = 0;
unsigned long lastPacketSent = 0;
bool mpuReady = false;
bool temperaturePending = false;
bool temperatureValid = false;
bool motionValid = false;
float temperatureC = 0;
sensors_event_t acceleration, gyro;
unsigned long temperatureRequestedAt = 0;
unsigned long temperatureUpdatedAt = 0;
unsigned long motionUpdatedAt = 0;
unsigned long lastMotionRead = 0;
unsigned long lastSerialPrint = 0;

// MPU6515 memakai register keluarga MPU6500, bukan driver Adafruit MPU6050.
// Referensi register/identitas: Linux drivers/iio/imu/inv_mpu6050/inv_mpu_iio.h.
bool readMpuRegisters(uint8_t reg, uint8_t* data, uint8_t count) {
  Wire.beginTransmission(MPU_ADDRESS);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom(MPU_ADDRESS, count) != count) return false;
  for (uint8_t i = 0; i < count; i++) {
    if (!Wire.available()) return false;
    data[i] = Wire.read();
  }
  return true;
}

bool writeMpuRegister(uint8_t reg, uint8_t value) {
  Wire.beginTransmission(MPU_ADDRESS);
  Wire.write(reg);
  Wire.write(value);
  return Wire.endTransmission() == 0;
}

bool beginMpu6515() {
  if (!writeMpuRegister(0x6B, 0x80)) return false; // Device reset
  delay(100);

  const uint8_t config[][2] = {
    {0x6B, 0x01}, // PWR_MGMT_1: wake, PLL clock
    {0x6C, 0x00}, // PWR_MGMT_2: aktifkan semua sumbu
    {0x6A, 0x00}, // USER_CTRL: FIFO dan I2C master mati
    {0x23, 0x00}, // FIFO_EN
    {0x38, 0x00}, // INT_ENABLE: pembacaan polling
    {0x19, 0x09}, // SMPLRT_DIV: 1 kHz / (9+1) = 100 Hz
    {0x1A, 0x04}, // CONFIG: gyro DLPF sekitar 20 Hz
    {0x1B, 0x08}, // GYRO_CONFIG: +/-500 derajat/detik
    {0x1C, 0x10}, // ACCEL_CONFIG: +/-8 g
    {0x1D, 0x04}, // ACCEL_CONFIG2: accel DLPF sekitar 20 Hz
  };

  for (const auto& setting : config) {
    if (!writeMpuRegister(setting[0], setting[1])) return false;
    delay(10);
  }
  delay(100); // Tunggu akselerometer dan giroskop stabil
  return true;
}

int16_t decodeMpuAxis(const uint8_t* data) {
  uint16_t raw = (uint16_t(data[0]) << 8) | data[1];
  return raw < 0x8000 ? int16_t(raw) : int16_t(int32_t(raw) - 65536);
}

bool readMotion() {
  if (!mpuReady) return false;
  uint8_t status = 0;
  if (!readMpuRegisters(0x3A, &status, 1) || !(status & 0x01)) return false;
  uint8_t data[14]; // Accel XYZ, suhu internal (dilewati), gyro XYZ
  if (!readMpuRegisters(0x3B, data, sizeof(data))) return false;

  // +/-8 g: 4096 LSB/g; +/-500 dps: 65.5 LSB/(derajat/detik).
  // API/dashboard menggunakan satuan SI yang sama dengan Adafruit.
  const float accelScale = SENSORS_GRAVITY_STANDARD / 4096.0f;
  const float gyroScale = DEG_TO_RAD / 65.5f;
  acceleration.acceleration.x = decodeMpuAxis(data) * accelScale;
  acceleration.acceleration.y = decodeMpuAxis(data + 2) * accelScale;
  acceleration.acceleration.z = decodeMpuAxis(data + 4) * accelScale;
  gyro.gyro.x = decodeMpuAxis(data + 8) * gyroScale;
  gyro.gyro.y = decodeMpuAxis(data + 10) * gyroScale;
  gyro.gyro.z = decodeMpuAxis(data + 12) * gyroScale;
  return true;
}

void updateSensors() {
  unsigned long now = millis();

  // Tunggu konversi suhu tanpa menghentikan layanan web.
  if (temperaturePending && now - temperatureRequestedAt >= TEMPERATURE_CONVERSION_MS) {
    temperatureC = ds18b20.getTempCByIndex(0);
    temperatureValid = isfinite(temperatureC) &&
      temperatureC != DEVICE_DISCONNECTED_C &&
      temperatureC >= -55 && temperatureC <= 125;
    temperatureUpdatedAt = now;
    temperaturePending = false;
  }
  if (!temperaturePending && now - temperatureRequestedAt >= SENSOR_INTERVAL_MS) {
    ds18b20.requestTemperatures();
    temperatureRequestedAt = millis();
    temperaturePending = true;
  }

  if (now - lastMotionRead >= MOTION_INTERVAL_MS) {
    lastMotionRead = now;
    motionValid = readMotion();
    if (motionValid) {
      motionValid = isfinite(acceleration.acceleration.x) &&
        isfinite(acceleration.acceleration.y) &&
        isfinite(acceleration.acceleration.z) &&
        isfinite(gyro.gyro.x) && isfinite(gyro.gyro.y) && isfinite(gyro.gyro.z);
    }
    motionUpdatedAt = now;
  }
}

void setupEspNow() {
  if (esp_wifi_set_channel(ESPNOW_CHANNEL, WIFI_SECOND_CHAN_NONE) != ESP_OK ||
      esp_now_init() != ESP_OK) {
    Serial.println("[ESP-NOW] Gagal mengaktifkan pengirim.");
    return;
  }

  esp_now_peer_info_t peer = {};
  memcpy(peer.peer_addr, BROADCAST_MAC, sizeof(BROADCAST_MAC));
  peer.channel = ESPNOW_CHANNEL;
  peer.ifidx = WIFI_IF_STA;
  peer.encrypt = false;
  if (esp_now_add_peer(&peer) != ESP_OK) {
    Serial.println("[ESP-NOW] Gagal menambahkan peer broadcast.");
    esp_now_deinit();
    return;
  }
  espNowReady = true;
  Serial.printf("[ESP-NOW] ESP32-A siap, kanal %u, interval %lu ms.\n",
    ESPNOW_CHANNEL, SEND_INTERVAL_MS);
}

void sendEspNowData() {
  unsigned long now = millis();
  if (!espNowReady || now - lastPacketSent < SEND_INTERVAL_MS) return;
  lastPacketSent = now;

  SensorPacket packet = {};
  packet.magic = SENSOR_PACKET_MAGIC;
  packet.version = SENSOR_PACKET_VERSION;
  packet.seq = ++packetSequence;
  packet.t_ms = now;
  if (temperatureValid) packet.flags |= SENSOR_TEMPERATURE_VALID;
  if (motionValid) packet.flags |= SENSOR_MOTION_VALID;
  packet.temperature_age_ms = temperatureValid ? now - temperatureUpdatedAt : UINT32_MAX;
  packet.temperature_c = temperatureValid ? temperatureC : NAN;
  // MPU6515 dikonfigurasi +/-8g. Konversi dari SI ke mg, bukan skala +/-2g.
  const float toMg = 1000.0f / SENSORS_GRAVITY_STANDARD;
  packet.x_mg = motionValid ? acceleration.acceleration.x * toMg : NAN;
  packet.y_mg = motionValid ? acceleration.acceleration.y * toMg : NAN;
  packet.z_mg = motionValid ? acceleration.acceleration.z * toMg : NAN;
  packet.gx_rad_s = motionValid ? gyro.gyro.x : NAN;
  packet.gy_rad_s = motionValid ? gyro.gyro.y : NAN;
  packet.gz_rad_s = motionValid ? gyro.gyro.z : NAN;
  // Bagian audio paket v2 dibiarkan kosong untuk kompatibilitas ukuran radio.
  // Tidak ada inisialisasi, pembacaan, atau pemeriksaan sensor audio.

  // ESP_OK berarti masuk antrean radio, bukan bukti diterima oleh B.
  esp_err_t result = esp_now_send(BROADCAST_MAC,
    reinterpret_cast<const uint8_t*>(&packet), sizeof(packet));
  if (result == ESP_OK) packetsQueued++;
  else packetQueueErrors++;
}

void sendSensorData() {
  unsigned long now = millis();
  String json;
  json.reserve(768);
  json = "{\"temperature\":{\"ok\":";
  json += temperatureValid ? "true" : "false";
  json += ",\"celsius\":";
  json += temperatureValid ? String(temperatureC, 2) : "null";
  json += ",\"age_ms\":";
  json += temperatureValid ? String(now - temperatureUpdatedAt) : "null";
  json += "},\"motion\":{\"ok\":";
  json += motionValid ? "true" : "false";
  json += ",\"ax\":";
  json += motionValid ? String(acceleration.acceleration.x, 3) : "null";
  json += ",\"ay\":";
  json += motionValid ? String(acceleration.acceleration.y, 3) : "null";
  json += ",\"az\":";
  json += motionValid ? String(acceleration.acceleration.z, 3) : "null";
  json += ",\"gx\":";
  json += motionValid ? String(gyro.gyro.x, 3) : "null";
  json += ",\"gy\":";
  json += motionValid ? String(gyro.gyro.y, 3) : "null";
  json += ",\"gz\":";
  json += motionValid ? String(gyro.gyro.z, 3) : "null";
  json += ",\"age_ms\":";
  json += motionValid ? String(now - motionUpdatedAt) : "null";
  json += "},\"clients\":";
  json += String(WiFi.softAPgetStationNum());
  json += "}";
  server.sendHeader("Cache-Control", "no-store");
  server.send(200, "application/json", json);
}

void setupWiFi() {
  if (!WiFi.mode(WIFI_AP_STA)) {
    Serial.println("[WiFi] GAGAL mengaktifkan radio Wi-Fi.");
    return;
  }
  // STA dipakai ESP-NOW; AP dipakai dashboard pada kanal radio yang sama.
  WiFi.setSleep(false);
  WiFi.setAutoReconnect(false);
  WiFi.disconnect();
  if (!WiFi.softAP(AP_SSID, AP_PASSWORD, ESPNOW_CHANNEL)) {
    Serial.println("[WiFi] GAGAL mengaktifkan Access Point.");
    return;
  }

  Serial.println("[WiFi] Access Point aktif!");
  Serial.print("[WiFi] Nama jaringan: ");
  Serial.println(AP_SSID);
  Serial.print("[WiFi] Alamat IP ESP32: ");
  Serial.println(WiFi.softAPIP());
  Serial.println("[WiFi] Hubungkan HP ke jaringan ini (tanpa internet).");

  server.on("/", HTTP_GET, []() {
    server.sendHeader("Cache-Control", "no-store");
    server.send_P(200, "text/html; charset=utf-8", DASHBOARD_HTML);
    });
  server.on("/api/sensors", HTTP_GET, sendSensorData);
  server.onNotFound([]() {
    server.send(404, "text/plain; charset=utf-8", "Halaman tidak ditemukan.");
    });
  server.begin();
  Serial.print("[Web] Buka http://");
  Serial.print(WiFi.softAPIP());
  Serial.println(" di browser HP.");
}

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);

  // Inisialisasi I2C
  Wire.begin(21, 22);
  Wire.setClock(100000); // I2C standar 100 kHz
  Wire.setTimeOut(50);
  delay(200);

  Serial.println("=== Eco-Herd ESP32-A ===");
  setupWiFi();
  setupEspNow();

  // Inisialisasi DS18B20
  ds18b20.begin();
  ds18b20.setResolution(12);
  ds18b20.setWaitForConversion(false);
  mpuReady = beginMpu6515();
  if (!mpuReady) Serial.println("[IMU] Inisialisasi MPU6515 gagal.");

  Serial.println("======================================\n");
  ds18b20.requestTemperatures();
  temperatureRequestedAt = millis();
  temperaturePending = true;
}

void loop() {
  server.handleClient();
  updateSensors();
  sendEspNowData();

  if (millis() - lastSerialPrint < 2000) {
    delay(1);
    return;
  }
  lastSerialPrint = millis();
  Serial.println("--- Pembacaan Data Sensor ---");

  if (!temperatureValid) {
    Serial.println("DS18B20 : Error / Terputus");
  } else {
    Serial.print("DS18B20 Suhu : ");
    Serial.print(temperatureC);
    Serial.println(" °C");
  }

  if (motionValid) {
    Serial.print("Akselerometer: X = ");
    Serial.print(acceleration.acceleration.x, 2);
    Serial.print(" | Y = ");
    Serial.print(acceleration.acceleration.y, 2);
    Serial.print(" | Z = ");
    Serial.print(acceleration.acceleration.z, 2);
    Serial.println(" m/s^2");

    Serial.print("Giroskop     : X = ");
    Serial.print(gyro.gyro.x, 2);
    Serial.print(" | Y = ");
    Serial.print(gyro.gyro.y, 2);
    Serial.print(" | Z = ");
    Serial.print(gyro.gyro.z, 2);
    Serial.println(" rad/s");
  } else if (!mpuReady) {
    Serial.println("IMU         : Inisialisasi gagal.");
  } else {
    Serial.println("IMU         : Data belum tersedia / gagal membaca data");
  }

  Serial.printf("ESP-NOW     : Antrean TX=%lu | Gagal antre=%lu\n\n",
    (unsigned long)packetsQueued, (unsigned long)packetQueueErrors);
}
