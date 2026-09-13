#include <Wire.h>
#include <WiFi.h>
#include <WebServer.h>
#include <math.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include "dashboard.h"

#define ONE_WIRE_BUS 4

// Jaringan Wi-Fi yang dipancarkan ESP32. Password minimal 8 karakter.
const char* AP_SSID = "Eco-Herd-ESP32";
const char* AP_PASSWORD = "ecoherd123";

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature ds18b20(&oneWire);
Adafruit_MPU6050 mpu;
WebServer server(80);

const unsigned long SENSOR_INTERVAL_MS = 1000;
const unsigned long TEMPERATURE_CONVERSION_MS = 750; // DS18B20 12-bit
bool mpuReady = false;
bool temperaturePending = false;
bool temperatureValid = false;
bool motionValid = false;
float temperatureC = 0;
sensors_event_t acceleration, gyro, mpuTemperature;
unsigned long temperatureRequestedAt = 0;
unsigned long temperatureUpdatedAt = 0;
unsigned long motionUpdatedAt = 0;
unsigned long lastMotionRead = 0;
unsigned long lastSerialPrint = 0;

bool mpuResponding() {
  Wire.beginTransmission(MPU6050_I2CADDR_DEFAULT);
  return Wire.endTransmission() == 0;
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

  if (now - lastMotionRead >= SENSOR_INTERVAL_MS) {
    lastMotionRead = now;
    // Jangan mengakses driver jika inisialisasi MPU6050 gagal.
    // getEvent() pada library ini selalu mengembalikan true; cek ACK I2C juga.
    motionValid = mpuReady && mpuResponding() &&
                  mpu.getEvent(&acceleration, &gyro, &mpuTemperature) && mpuResponding();
    if (motionValid) {
      motionValid = isfinite(acceleration.acceleration.x) &&
                    isfinite(acceleration.acceleration.y) &&
                    isfinite(acceleration.acceleration.z) &&
                    isfinite(gyro.gyro.x) && isfinite(gyro.gyro.y) && isfinite(gyro.gyro.z);
    }
    motionUpdatedAt = now;
  }
}

void sendSensorData() {
  unsigned long now = millis();
  String json;
  json.reserve(512);
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
  if (!WiFi.mode(WIFI_AP) || !WiFi.softAP(AP_SSID, AP_PASSWORD)) {
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
  Wire.setTimeOut(50);
  delay(200); // Jeda agar MPU6050 siap menerima sinyal I2C

  Serial.println("=== Pengujian Sensor dan WiFi ESP32 ===");
  setupWiFi();

  // Inisialisasi DS18B20
  ds18b20.begin();
  ds18b20.setResolution(12);
  ds18b20.setWaitForConversion(false);
  int deviceCount = ds18b20.getDeviceCount();
  if (deviceCount == 0) {
    Serial.println("[GAGAL] Sensor DS18B20 tidak terdeteksi pada GPIO 4.");
  } else {
    Serial.print("[BERHASIL] Sensor DS18B20 terdeteksi. Jumlah sensor: ");
    Serial.println(deviceCount);
  }

  // Percobaan ulang inisialisasi MPU6050 hingga 5 kali
  for (int i = 0; i < 5; i++) {
    if (mpu.begin()) {
      mpuReady = true;
      break;
    }
    delay(100);
  }

  if (!mpuReady) {
    Serial.println("[GAGAL] Sensor MPU6050 tidak terdeteksi pada I2C.");
  } else {
    Serial.println("[BERHASIL] Sensor MPU6050 terhubung!");
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  }

  Serial.println("======================================\n");
  ds18b20.requestTemperatures();
  temperatureRequestedAt = millis();
  temperaturePending = true;
}

void loop() {
  server.handleClient();
  updateSensors();

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
  } else {
    Serial.println("MPU6050     : Gagal membaca data");
  }

  Serial.println();
}
