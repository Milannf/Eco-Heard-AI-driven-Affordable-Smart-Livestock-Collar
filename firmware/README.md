# Eco-Herd: firmware ESP32-A dan ESP32-B

`DS18B20 + IMU -> A -> ESP-NOW -> B -> HTTP -> backend SQLite/AI -> website`

## Build dan upload

```powershell
pio run -e esp32doit-devkit-v1
pio run -e esp32-b
pio run -e esp32doit-devkit-v1 -t upload --upload-port COM_A
pio run -e esp32-b -t upload --upload-port COM_B
pio device monitor --port COM_B --baud 115200
```

Ganti port sesuai board. Default environment adalah A. Firmware A: `src/main.cpp`;
B: `src/receiver.cpp` + `src/telemetry_uploader.cpp`.

## Hardware dan sampling

- DS18B20 GPIO4, konversi 12-bit async 750 ms, update sekitar 1 detik.
- IMU SDA21/SCL22, alamat 0x68 (AD0 ke GND). Hardware yang diuji sebelumnya MPU6515;
  firmware menggunakan register keluarga MPU6500, bukan driver MPU6050 Adafruit.
- Range ±8 g (4096 LSB/g), gyro ±500 dps. IMU dibaca dan paket dikirim setiap 100 ms.
- API dashboard A dalam m/s²; paket radio/backend dalam mg (1000 mg = 1 g).
- **Audio dinonaktifkan**: `audio_sensor.cpp` tidak dibuild, tidak ada task I2S,
  pemeriksaan mic, output Audio=invalid, atau kartu audio. Modul source lama tetap
  terpisah dari firmware aktif. Layout paket v2/68 byte tetap kompatibel; area audio
  kosong. B mengirim JSON v1 yang hanya berisi suhu dan gerakan.

## Koneksi

`include/sensor_packet.h`: kanal saat ini **8**. A/B/router harus sama kanal tetap
2.4 GHz. B hanya bisa menerima A dengan andal saat radio berada di kanal A.

`include/gateway_config.h`: isi SSID/password router dan URL API. Contoh template
ada pada `gateway_config.example.h`; IP tujuan adalah komputer backend, bukan B.

```cpp
constexpr char GATEWAY_API_URL[] = "http://IP_KOMPUTER:3001/api/telemetry/batch";
```

SSID kosong: B hanya menerima ESP-NOW. URL kosong: upload dimatikan. Untuk HTTPS,
isi root CA sesuai server; waktu NTP digunakan untuk validasi sertifikat.

Dashboard langsung A: Wi-Fi `Eco-Herd-ESP32`, password `ecoherd123`, browser
`http://192.168.4.1`. Ini berbeda dari website/backend pada jaringan router.

## Log B

- RX dicetak satu snapshot per detik, namun setiap paket tetap diupload pada 10 Hz.
  Lompatan seq pada log snapshot tidak berarti paket hilang.
- `[WiFi] Menghubungkan...` lalu IP, kanal, atau timeout dengan reason disconnect.
- `[Status B]` setiap 5 detik: total RX, status Wi-Fi, kanal, alasan putus terakhir.
- `[API] Menunggu Wi-Fi...`: paket lokal diterima tetapi router belum tersambung.
- `[API] Gagal ...`: kode/deskripsi HTTP, URL tujuan, IP B, RSSI.
- `[API] Tersimpan/diakui ... (HTTP 200)`: batch diakui backend.

Timeout koneksi 20 detik, retry 30 detik sejak awal percobaan. Scan/reconnect dapat
melewatkan paket radio. Antrean RX 20 paket, antrean upload 200 sampel, batch 10;
antrean penuh melewatkan sampel baru. Retry HTTP memakai ID gateway/sesi/record
agar database tidak menggandakan data.

## Website, Docker, AI

Proyek aplikasi pada laptop pengembangan:
`C:\Project SFT\Eco-Heard-AI-driven-Affordable-Smart-Livestock-Collar`.

- `README.md`: Docker Compose dan pembuatan ZIP portabel beserta firmware/model.
- `INTEGRASI_SENSOR.md`: langkah koneksi, firewall, URL, dan penggunaan website.
- `INTEGRASI_AI.md`: model 37 fitur dengan extractor prototipe di Python laptop.

Tidak ada data contoh sapi/suhu/metana pada website. Ternak didaftarkan pengguna
dan disimpan SQLite. AI ditandai eksperimental, pemetaan nama kelas membutuhkan
LabelEncoder benar dari pembuat model, dan metana belum memiliki hasil tervalidasi.

## Verifikasi perangkat

1. Upload A/B terbaru; pastikan kanal startup sama dengan router.
2. Pastikan B memperoleh IP dan health API bisa dibuka dari HP di router yang sama.
3. Tunggu HTTP 200 dan jumlah record bertambah pada website.
4. Gerakkan IMU dan amati data berubah; sentuh probe suhu dan amati suhu berubah.
5. Putuskan sensor dengan daya dimatikan lalu uji status invalid tanpa data buatan.
