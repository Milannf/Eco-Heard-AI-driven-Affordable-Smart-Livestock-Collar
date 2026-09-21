# Panduan lengkap Eco-Herd di laptop lain

Panduan ini untuk versi UI **Sapi saya**, logger USB + CSV + API, dan fitur hapus
sapi. Jalur yang disarankan memakai USB pada ESP32-B; tidak perlu Wi-Fi pada B.

## 1. Gambaran sistem

```text
DS18B20 + MPU6515
       |
    ESP32-A -- ESP-NOW kanal 6 --> ESP32-B
                                      |
                                     USB
                                      |
                             Logger Python di laptop
                                |             |
                               CSV       API port 3001
                                              |
                                      SQLite + worker AI
                                              |
                                    Web / browser HP
```

A membaca sensor; B menerima paket. Laptop harus menyala, Docker aktif, dan logger
berjalan agar data langsung muncul. Membuka Serial Monitor saja tidak mengirim
data ke aplikasi. CSV dan database merupakan dua penyimpanan terpisah.

## 2. Yang perlu disiapkan

- Laptop Windows 10/11 dengan dukungan Docker Desktop/WSL2 dan virtualisasi aktif.
- Docker Desktop: https://www.docker.com/products/docker-desktop/
- Python 3.11 atau lebih baru: https://www.python.org/downloads/
- Kabel USB **data**, ESP32-A dan ESP32-B, catu daya A, sensor serta kabelnya.
- Driver USB sesuai board bila port tidak muncul: CP210x (board pengujian) atau CH340.
- Internet untuk instalasi dan build awal. Setelah image tersedia, monitoring lokal
  tidak memerlukan internet (prediksi model juga berjalan lokal).
- Opsional untuk upload firmware: VS Code + ekstensi PlatformIO IDE.

Instal Docker Desktop dengan backend Linux/WSL2. Restart jika diminta, buka Docker
Desktop, lalu periksa di PowerShell:

```powershell
docker version
docker compose version
py --version
```

`docker version` harus menampilkan Client dan Server. Jangan menutup Docker Desktop
saat menggunakan aplikasi. Node.js tidak perlu diinstal di laptop untuk mode Docker.

## 3. Salin proyek yang lengkap

Cara utama: instal Git, lalu clone branch `tom-sensor` (setelah commit ini dipush):

```powershell
git clone --branch tom-sensor https://github.com/Milannf/Eco-Heard-AI-driven-Affordable-Smart-Livestock-Collar.git Eco-Herd
Set-Location Eco-Herd
```

Contoh path dalam panduan ini adalah `C:\Eco-Herd-System\Eco-Herd`; sesuaikan
dengan lokasi clone Anda. Alternatif offline source: ekstrak **Eco-Herd-latest.zip**.
Source hasil clone sudah lengkap; model AI tidak disimpan di Git. Salin tiga file
model terpercaya dari pembuat model ke `models/`, atau set `AI_ENABLED=0` dalam
`.env` untuk menjalankan monitoring sensor tanpa AI. Model tidak diperlukan untuk
CSV, pembacaan sensor, daftar/detail sapi, atau fitur hapus sapi.

Struktur penting:

```text
Eco-Herd/
  compose.yaml
  .env.example
  PANDUAN_LAPTOP_BARU.md
  agritrack/                 # Aplikasi Expo/web, package.json dan lockfile
  backend/                   # API, SQLite, worker AI
  docker/                    # Dockerfile API/web dan Nginx
  models/                    # Tiga artefak model perilaku
  firmware/
    platformio.ini
    include/sensor_packet.h
    include/gateway_config.example.h # Default mode USB tanpa credential
    src/main.cpp
    src/receiver.cpp
    tools/log_csv.py
    tools/api_bridge.py
    CSV_LOKAL.md
```

Arsip source tidak membawa data sapi/database lama, CSV pribadi, password Wi-Fi,
akun browser, atau cache build. Jika ingin memindahkan data lama, lihat bagian backup.

File pendukung aplikasi yang sempat hilang telah dipulihkan untuk versi Git ini.
Folder `firmware` adalah firmware A/B terkini; `sensor/main.cpp` adalah kode lama.
Tidak perlu menyalin `node_modules` atau `.pio`.

## 4. Jalankan backend dan website

Buka PowerShell pada folder yang berisi `compose.yaml`:

```powershell
Set-Location "C:\Eco-Herd-System\Eco-Herd"
Copy-Item .env.example .env
```

Lakukan penyalinan `.env` hanya pada instalasi baru; jangan menimpa konfigurasi
yang sudah Anda isi. Edit `.env` menjadi:

```dotenv
MODEL_DIR=./models
API_PORT=3001
WEB_PORT=18080
```

Port 18080 digunakan agar tidak bertabrakan dengan aplikasi lain pada 8080.
Jika memakai terminal yang pernah mengatur `$env:WEB_PORT`/`API_PORT`/`MODEL_DIR`,
buka terminal baru: variabel environment terminal mengalahkan isi `.env`.

Jalankan:

```powershell
docker compose -p eco-herd up -d --build --wait
docker compose -p eco-herd ps
```

Build pertama dapat memerlukan beberapa menit. Kedua service harus healthy.
Gunakan project `-p eco-herd` yang sama agar selalu memakai database/volume yang sama.

Periksa:

```powershell
Invoke-RestMethod http://localhost:3001/api/health
Invoke-RestMethod http://localhost:18080/api/health
```

Keduanya harus menghasilkan `ok: True`. Buka **http://localhost:18080**.
Daftar/login memakai akun lokal browser. Akun ini tidak otomatis ikut pindah ke
laptop/browser/HP lain dan bukan autentikasi server untuk deployment publik.

## 5. Siapkan ESP32-A dan ESP32-B

### Jika firmware terbaru sudah ada

Tidak perlu upload ulang hanya karena berganti laptop. Pastikan A/B sama-sama kanal
6 dan B menampilkan mode USB lokal. Nomor COM laptop baru mungkin berbeda.

### Jika perlu upload

Buka folder `firmware` sebagai proyek PlatformIO di VS Code.

| Board | Environment | Kode |
|---|---|---|
| A | `esp32doit-devkit-v1` | `src/main.cpp` |
| B | `esp32-b` | `src/receiver.cpp` dan `src/telemetry_uploader.cpp` |

Pada clone baru, firmware otomatis memakai `include/gateway_config.example.h`.
Untuk konfigurasi pribadi, salin template sekali dari folder firmware:

```powershell
Copy-Item include/gateway_config.example.h include/gateway_config.h
```

File `gateway_config.h` diabaikan Git agar password pribadi tidak ter-commit.
Konfigurasi mode lokal:

```cpp
constexpr bool GATEWAY_LOCAL_CSV_ONLY = true;
```

SSID/password/alamat API pada file tersebut tidak digunakan dalam mode lokal.
`include/sensor_packet.h` harus sama di A dan B, dengan `ESPNOW_CHANNEL = 6`.

Pada terminal PlatformIO:

```powershell
pio device list
pio run -e esp32doit-devkit-v1 -t upload --upload-port COM7
```

Perintah di atas untuk **A yang sedang terhubung**. Ganti board ke B, lalu:

```powershell
pio run -e esp32-b -t upload --upload-port COM7
```

Ganti COM7 sesuai hasil daftar port. Jangan menjalankan upload A pada board B.
Jika `Wrong boot mode`/gagal Connecting, tahan BOOT selama Connecting dan lepaskan
ketika penulisan dimulai. Tutup Serial Monitor/logger sebelum upload.

### Koneksi sensor A

- DS18B20: data GPIO4, pull-up sekitar 4,7 kΩ dari data ke 3,3 V, VCC dan GND
  sesuai modul. Gunakan mode catu daya eksternal untuk konfigurasi ini.
- MPU6515: SDA GPIO21, SCL GPIO22, GND bersama, alamat I2C `0x68` (AD0 rendah).
  Gunakan catu daya yang sesuai modul dan logika I2C 3,3 V.
- Driver saat ini memakai register keluarga MPU6500 untuk MPU6515. Jangan
  mengasumsikan semua modul berlabel MPU6050/MPU9250 kompatibel identik.

Nyalakan A dengan USB/adaptor dan sambungkan B ke laptop. Letakkan berdekatan saat
uji awal. B harus menampilkan ringkasan suhu/gerakan, bukan terus menunggu A.

## 6. Instal dan jalankan logger USB

Di PowerShell baru, dari folder firmware:

```powershell
Set-Location "C:\Eco-Herd-System\Eco-Herd\firmware"
py -m venv .venv
& ".\.venv\Scripts\python.exe" -m pip install pyserial
& ".\.venv\Scripts\python.exe" -m serial.tools.list_ports
```

Tidak perlu aktivasi venv atau mengubah ExecutionPolicy. Instalasi venv hanya sekali.
Tutup Serial Monitor dan logger lain sebelum memakai port yang sama. Mulai pencatatan:

```powershell
& ".\.venv\Scripts\python.exe" tools/log_csv.py --port COM7 --api-url http://127.0.0.1:3001
```

Logger otomatis mengaktifkan streaming B. Angka berikut harus bertambah:

```text
Tersimpan=... | baris rusak=0
[API] API diakui=... | tertunda=... | hanya CSV=0
```

`Tersimpan` adalah jumlah baris CSV; `API diakui` adalah jumlah sampel yang diakui
backend. Selisih kecil sementara normal karena batching. Biarkan terminal terbuka.
Untuk pengujian terbatas tambahkan `--seconds 30`. Tekan Ctrl+C untuk berhenti normal.

CSV otomatis dibuat di `firmware\records\eco-herd_<waktu>.csv` jika dijalankan dari
folder firmware. Lokasi lengkap dicetak logger. Buka dengan Excel setelah berhenti;
jika kolom menyatu, Data -> From Text/CSV -> delimiter koma. Waktu CSV memakai UTC.

Firmware tidak menyimpan file dalam flash/SD. Data sebelum logger mulai atau saat
USB terlepas tidak direkam. Jika USB terputus, sambungkan lagi dan jalankan ulang
logger (file dan session baru). Jika aplikasi offline, CSV tetap berjalan dan
pengiriman dicoba ulang. Antrean RAM terbatas 3000 sampel; antrean tersisa tidak
otomatis dipulihkan pada sesi baru. Logger memberi tahu sampel yang hanya ada di CSV.

## 7. Lihat dan kelola sapi

1. Buka **http://localhost:18080**. Halaman utama adalah **Sapi saya**.
2. Pilih **Tambah sapi**, isi nama/nomor dan informasi yang diketahui, lalu simpan.
3. Buka **Pengaturan sensor** (`/sensor-settings`). Pilih **Gunakan alamat server
   halaman ini**, kemudian **Simpan alamat API** dan tes koneksi jika diperlukan.
4. Pilih sensor yang masuk, misalnya **Sensor 1**, lalu pilih sapi dan simpan pasangan.
   Untuk banyak sensor, urutan mengikuti daftar perangkat; hubungkan satu per satu
   saat pemasangan awal agar mudah mengenali perangkat. MAC tidak ditampilkan.
5. Opsi menyertakan record lama mengaitkan pembacaan yang masih belum memiliki sapi.
   Jika tidak dipilih, detail sapi menampilkan data baru setelah pemasangan.
6. Kembali ke daftar sapi, klik kartu sapi untuk melihat identitas, suhu, gerakan,
   dan waktu pembaruan. Data diambil sekitar setiap 5 detik.
7. Riwayat dan analisis perilaku tersedia melalui tombol pada halaman detail.

**Hapus sapi:** buka detail -> Hapus sapi -> baca konfirmasi -> Ya, hapus sapi.
Nama sapi dihapus, sensor dilepas, riwayat pembacaan tetap tersimpan sebagai data
sensor yang belum dikaitkan. Sapi lain tidak dihapus. Tombol Batal membatalkan tindakan.

Status **Menunggu data** berarti belum ada pembacaan baru (batas status sekitar
15 detik), bukan diagnosis kesehatan sapi. Suhu invalid disimpan kosong, bukan nol.
Suhu di collar tidak otomatis sama dengan suhu inti tubuh. Sekitar 10 paket/detik
tidak berarti suhu diperbarui 10 kali/detik: DS18B20 diperbarui sekitar sekali/detik.

## 8. Buka dari HP / mobile

Laptop dan HP harus bisa saling menjangkau pada jaringan yang sama. Cari IPv4 Wi-Fi
laptop melalui `ipconfig`, lalu buka `http://IP_LAPTOP:18080` di browser HP.
Jangan memakai localhost pada HP. Untuk browser Docker, gunakan alamat server
halaman ini pada Pengaturan sensor. Logger tetap memakai localhost:3001 di laptop.

Jika diperlukan, izinkan port TCP 18080 pada firewall untuk jaringan lokal yang
dipercaya. Jangan mematikan seluruh firewall. Hotspot tertentu mengisolasi perangkat;
gunakan jaringan yang memungkinkan komunikasi antarperangkat.

Untuk aplikasi Expo native, alamat backend adalah `http://IP_LAPTOP:3001` dan port
3001 perlu dapat dijangkau. Docker hanya menyediakan website, bukan APK. Build APK
dan distribusi aplikasi native belum termasuk alur yang diverifikasi panduan ini.

## 9. AI perilaku

Folder `models` memerlukan `behaviour_lgbm.joblib`, `feature_cols.joblib`, dan
`label_encoder.joblib`. Model harus cocok dengan versi dependency worker. Periksa
`http://localhost:3001/api/ai/status` jika prediksi tidak tersedia.

Model perilaku saat ini eksperimen: preprocessing pelatihan belum diverifikasi,
dan file encoder yang tersedia salah jenis sehingga nama perilaku belum dapat
ditentukan dengan benar. Prediksi memerlukan sekitar 100 sampel berurutan yang
memenuhi validitas/waktu. Monitoring sensor dan daftar sapi tetap berguna tanpa
prediksi. Angka probabilitas bukan akurasi model. Estimasi metana tervalidasi belum
tersedia dan tidak boleh disamakan dengan pengukuran CH4.

## 10. Menjalankan ulang dan menghentikan

Setelah restart laptop, buka Docker Desktop. Dari root aplikasi:

```powershell
docker compose -p eco-herd up -d --wait
docker compose -p eco-herd ps
```

Lalu jalankan logger dari folder firmware seperti bagian 6. Jika baru mengubah
source gunakan `up -d --build --wait`. Untuk log masalah:

```powershell
docker compose -p eco-herd logs --tail 100 api web
```

Untuk berhenti: Ctrl+C pada logger, kemudian:

```powershell
docker compose -p eco-herd stop
```

Data SQLite tersimpan dalam named volume **eco-herd_records**, bukan di dalam ZIP
source. `docker compose down` biasa mempertahankan volume; **jangan menambahkan -v**
jika ingin mempertahankan data. Jangan menghapus volume melalui Docker Desktop.

## 11. Backup dan pemindahan data lama (opsional)

Cara sederhana berikut membuat snapshot file SQLite saat API berhenti. Jalankan
dari root aplikasi laptop lama. Hentikan logger terlebih dahulu.

```powershell
New-Item -ItemType Directory -Path .\backup
docker compose -p eco-herd stop api
docker cp eco-herd-api-1:/data/. .\backup
docker compose -p eco-herd start api
```

Gunakan folder backup baru/kosong dan salin seluruh isi `/data`, termasuk file WAL/SHM
jika ada. Periksa file `eco-herd.sqlite` ada sebelum memindahkan backup. Salin folder
backup serta CSV yang Anda perlukan ke laptop baru. Akun browser tidak termasuk.

Pada instalasi **baru/kosong**, jalankan stack sekali lalu stop API dan pulihkan:

```powershell
docker compose -p eco-herd stop api
docker cp .\backup\. eco-herd-api-1:/data/
docker compose -p eco-herd run --rm --no-deps --user root api chown -R node:node /data
docker compose -p eco-herd start api
```

Jangan menimpa database laptop baru yang sudah memiliki data penting. Prosedur ini
memindahkan snapshot, bukan menggabungkan dua database. Setelah restore, periksa
daftar sapi dan jumlah record sebelum mulai logger. Backup pemindahan ini merupakan
petunjuk operasional; lakukan pengecekan hasil pada perangkat tujuan.

## 12. Pemecahan masalah

| Gejala | Pemeriksaan |
|---|---|
| Docker tidak bisa tersambung | Buka Docker Desktop, tunggu engine Linux aktif, jalankan docker version. |
| Port already allocated | Ubah WEB_PORT/API_PORT di .env, lalu jalankan ulang Compose; sesuaikan URL logger bila port API berubah. |
| COM7 tidak ada | Cek kabel data, driver, dan daftar port; nomor COM bisa berubah. |
| Access denied / port sibuk | Tutup Serial Monitor atau logger lain; jangan dua aplikasi pada satu COM. |
| Logger hanya 0 sampel | Periksa A menyala, kanal sama, B firmware terbaru; B harus menerima paket. |
| Website tetap pada waktu lama | Pastikan logger memakai --api-url dan API diakui bertambah. Serial Monitor bukan penghubung API. |
| CSV bertambah, API tidak | Periksa localhost:3001/api/health, port, Docker, dan pesan retry logger. |
| Sensor ada tetapi daftar sapi kosong | Tambahkan sapi, lalu kaitkan sensor melalui Pengaturan sensor. |
| Suhu kosong tetapi gerakan ada | Periksa validitas DS18B20, pull-up, daya, dan kabel A; jangan mengisi suhu buatan. |
| Gerakan kosong | Periksa IMU, alamat 0x68, SDA21/SCL22, daya dan log A. |
| Data detail kosong setelah pasangan dibuat | Tunggu data baru atau pilih opsi menyertakan record lama yang belum dikaitkan. |
| UI masih lama | Refresh Ctrl+F5 dan pastikan memakai port website yang benar. |
| File build hilang / konflik Git | Gunakan paket lengkap yang diuji, bukan source yang masih konflik. |

## 13. Checklist instalasi selesai

- [ ] API dan web healthy, kedua health endpoint menjawab ok.
- [ ] B menerima suhu/gerakan dari A atau menandai sensor invalid secara jujur.
- [ ] Logger menampilkan jumlah CSV dan API diakui yang bertambah.
- [ ] CSV nyata dapat dibuka di Excel.
- [ ] Sensor dikaitkan ke sapi, waktu pembaruan detail mengikuti waktu sekarang.
- [ ] Data tetap ada setelah restart API.
- [ ] Jika memakai HP, alamat LAN dapat diakses dan bukan localhost.

Dengan checklist tersebut, jalur A -> B -> laptop -> CSV + aplikasi sudah berjalan.
