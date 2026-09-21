# Pencatatan sensor ke spreadsheet lokal

## CSV sekaligus aplikasi Eco-Herd

Jalankan backend dan website Eco-Herd, lalu tutup Serial Monitor dan jalankan:

```powershell
& "$env:USERPROFILE\.platformio\penv\Scripts\python.exe" tools/log_csv.py --port COM7 --api-url http://127.0.0.1:3001
```

Alur: A -> ESP-NOW -> B -> USB -> logger -> CSV + API -> aplikasi.
Firmware B tetap mode lokal; tidak perlu upload ulang atau koneksi Wi-Fi B.
Pada konfigurasi laptop yang diuji, website Eco-Herd berada di
**http://localhost:18080/sensors**, API di **http://localhost:3001**.
Port 8080 dipakai aplikasi lain. Untuk menjalankan ulang stack Docker yang sama,
buka terminal pada folder aplikasi
`C:\Project SFT\Eco-Heard-AI-driven-Affordable-Smart-Livestock-Collar`:

```powershell
$env:WEB_PORT = '18080'
$env:API_PORT = '3001'
$env:MODEL_DIR = 'C:/Eco-Herd'
docker compose -p eco-herd up -d --wait
```

Kemudian jalankan logger dari folder proyek firmware. Nilai environment di atas
berlaku pada terminal tersebut; gunakan project `eco-herd` yang sama untuk memakai
volume database yang sama. Container otomatis restart sesuai pengaturan Compose,
tetapi logger USB di laptop tetap harus dijalankan saat ingin merekam.

Alamat `--api-url` adalah alamat dasar backend dari laptop, tanpa `/api`.
Logger mengirim batch di thread terpisah sehingga API offline tidak menghambat
penyimpanan CSV. Lihat penghitung `API diakui` untuk memastikan data masuk.

Buka halaman **Record Sensor** (`/sensors`) di aplikasi. Pilih alamat API server
halaman ini bila memakai Docker (same-origin), atau `http://localhost:3001` untuk
browser laptop. Pada HP, gunakan IP LAN laptop, bukan localhost. Perangkat A
muncul memakai MAC aslinya. Tambahkan ternak dan pasangkan collar jika diperlukan
untuk menampilkan data pada detail ternak. Aplikasi mengambil data berkala.

Bridge menggunakan ID gateway virtual yang stabil untuk laptop/port, bukan MAC B,
serta session baru setiap logger dijalankan. Retry memakai ID yang sama agar tidak
menggandakan record. Waktu observasi berasal dari penerimaan USB di laptop; selisih
waktu antrean HTTP diperhitungkan. Invalid sensor dikirim sebagai null.

Antrean RAM maksimal 3000 sampel (sekitar 5 menit pada 10 Hz). Jika penuh, sampel
baru tetap disimpan dalam CSV tetapi tidak diantrekan ke API. Saat berhenti logger
menunggu singkat untuk mengirim sisa antrean; data yang belum diakui tetap di CSV,
tetapi tidak otomatis diunggah ulang pada sesi berikutnya. CSV saja tetap tersedia
dengan menghilangkan opsi `--api-url`. Jangan jalankan dua logger pada COM yang sama.

Alur: ESP32-A (sensor) -> ESP-NOW -> ESP32-B -> USB -> Python -> CSV.
Tidak memerlukan router, website atau internet saat merekam.

## Persiapan board

- A: `src/main.cpp`, environment `esp32doit-devkit-v1`.
- B: `src/receiver.cpp` + `src/telemetry_uploader.cpp`, environment `esp32-b`.
- Kedua board harus memakai `include/sensor_packet.h` yang sama, sekarang kanal **6**.
- `GATEWAY_LOCAL_CSV_ONLY = true` pada `include/gateway_config.h` mematikan
  koneksi router dan upload HTTP. Radio ESP-NOW tetap aktif.
- Upload ulang **kedua board** secara bergantian ke port yang sesuai:

```powershell
pio run -e esp32doit-devkit-v1 -t upload --upload-port COM7
pio run -e esp32-b -t upload --upload-port COM7
```

Jalankan perintah A hanya ketika A terhubung; perintah B hanya ketika B terhubung.
Setelah upload, beri daya A dengan USB/adaptor dan sambungkan B ke laptop.

## Rekam

Dari folder proyek firmware, tutup Serial Monitor (port hanya dapat dipakai satu aplikasi):

```powershell
& "$env:USERPROFILE\.platformio\penv\Scripts\python.exe" tools/log_csv.py --port COM7
```

Python PlatformIO sudah memiliki pyserial. Jika memakai Python lain:
`python -m pip install pyserial`, lalu `python tools/log_csv.py --port COM7`.

File baru dibuat otomatis di `records/eco-herd_<waktu>.csv`. Tekan **Ctrl+C**
untuk selesai, lalu buka CSV dengan Excel/LibreOffice. Jika kolom menyatu di Excel,
gunakan Data -> From Text/CSV dan delimiter **koma**. Hindari membuka file yang
masih direkam dengan aplikasi yang mengunci file. Opsi `--seconds 30` merekam
30 detik; `--output records/percobaan.csv` memilih nama file (tidak menimpa file lama).

Serial Monitor secara default menampilkan ringkasan rapi setiap detik. Logger
mengirim perintah `CSV ON` otomatis saat mulai, dan `CSV OFF` saat berhenti normal
atau Ctrl+C. Saat streaming aktif, ringkasan digantikan baris mesin. Jika logger
ditutup paksa, kirim `CSV OFF` dengan akhiran newline dari Serial Monitor atau
reset B untuk kembali ke ringkasan. Gunakan logger dan firmware B terbaru bersama.

Saat logger aktif, setiap paket yang diterima B dicetak sebagai baris `DATA,...`, sekitar 10 Hz untuk
satu A. Log biasa diabaikan logger. Nilai sensor invalid disimpan kosong, disertai
flag 0; bukan nilai nol buatan. Suhu DS18B20 diperbarui sekitar sekali/detik,
sehingga suhu berulang antarbaris adalah normal. Akselerasi satuan mg, gyro rad/s.
`received_at_utc` adalah waktu penerimaan di laptop, bukan waktu pengukuran A;
`uptime_a_ms` dan `seq` membantu memeriksa interval/gap/reset A.

Logger harus tetap berjalan dengan B terhubung USB. B tidak menyimpan CSV dalam
flash/SD dan tidak mengulang data yang terlewat saat logger mati. ESP-NOW broadcast
tidak menjamin pengiriman tanpa kehilangan paket. CSV kosong hanya memiliki header
dan berarti belum menerima data. Untuk kembali memakai API, set mode lokal ke
false, periksa SSID/password/IP/kanal router, lalu upload firmware yang sesuai.
