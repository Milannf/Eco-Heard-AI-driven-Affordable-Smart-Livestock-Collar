#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

#define ONE_WIRE_BUS 4

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature ds18b20(&oneWire);
Adafruit_MPU6050 mpu;

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);

  // Inisialisasi I2C
  Wire.begin(21, 22);
  delay(200); // Jeda agar MPU6050 siap menerima sinyal I2C

  Serial.println("=== Pengujian Koneksi Sensor ESP32 ===");

  // Inisialisasi DS18B20
  ds18b20.begin();
  int deviceCount = ds18b20.getDeviceCount();
  if (deviceCount == 0) {
    Serial.println("[GAGAL] Sensor DS18B20 tidak terdeteksi pada GPIO 4.");
  } else {
    Serial.print("[BERHASIL] Sensor DS18B20 terdeteksi. Jumlah sensor: ");
    Serial.println(deviceCount);
  }

  // Percobaan ulang inisialisasi MPU6050 hingga 5 kali
  bool mpuReady = false;
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
  delay(1000);
}

void loop() {
  Serial.println("--- Pembacaan Data Sensor ---");

  // Pembacaan DS18B20
  ds18b20.requestTemperatures();
  float tempC = ds18b20.getTempCByIndex(0);

  if (tempC == DEVICE_DISCONNECTED_C) {
    Serial.println("DS18B20 : Error / Terputus");
  } else {
    Serial.print("DS18B20 Suhu : ");
    Serial.print(tempC);
    Serial.println(" °C");
  }

  // Pembacaan MPU6050
  sensors_event_t a, g, tempMPU;
  if (mpu.getEvent(&a, &g, &tempMPU)) {
    Serial.print("Akselerometer: X = ");
    Serial.print(a.acceleration.x, 2);
    Serial.print(" | Y = ");
    Serial.print(a.acceleration.y, 2);
    Serial.print(" | Z = ");
    Serial.print(a.acceleration.z, 2);
    Serial.println(" m/s^2");

    Serial.print("Giroskop     : X = ");
    Serial.print(g.gyro.x, 2);
    Serial.print(" | Y = ");
    Serial.print(g.gyro.y, 2);
    Serial.print(" | Z = ");
    Serial.print(g.gyro.z, 2);
    Serial.println(" rad/s");
  } else {
    Serial.println("MPU6050     : Gagal membaca data");
  }

  Serial.println();
  delay(2000);
}