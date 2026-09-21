# Eco-Herd — monitoring sensor nyata

Website **agritrack**, backend Node.js + SQLite, worker AI Python, dan firmware
ESP32 A/B. Folder `frontend` adalah template lama dan bukan website yang dijalankan.

## Mulai di laptop baru

Panduan utama: **[PANDUAN_LAPTOP_BARU.md](PANDUAN_LAPTOP_BARU.md)**, termasuk
instalasi, upload A/B, logger USB, akses HP, backup, dan troubleshooting.

```powershell
git clone --branch tom-sensor https://github.com/Milannf/Eco-Heard-AI-driven-Affordable-Smart-Livestock-Collar.git Eco-Herd
Set-Location Eco-Herd
Copy-Item .env.example .env
```

Untuk mengikuti panduan, isi `WEB_PORT=18080` pada `.env`, lalu:

```powershell
docker compose -p eco-herd up -d --build --wait
```

Buka **http://localhost:18080**. Firmware dan logger terkini ada di `firmware/`.
Model `.joblib` tidak disimpan di Git; kirim terpisah ke `models/` atau gunakan
`AI_ENABLED=0` untuk monitoring tanpa AI. Node.js/worker Python berjalan di Docker;
Python + pyserial pada laptop diperlukan untuk logger USB.

Alur utama: **A → ESP-NOW → B → USB → logger → CSV + API → aplikasi**.
Tutup Serial Monitor dan jalankan dari folder `firmware` (Python dengan pyserial):

```powershell
python tools/log_csv.py --port COM7 --api-url http://127.0.0.1:3001
```

UI utama adalah daftar sapi. Klik sapi untuk detail, riwayat, dan hapus sapi.
Hubungkan sensor melalui **Pengaturan sensor** (`/sensor-settings`). Penghapusan
sapi melepas sensor; riwayat tetap tersimpan sebagai data belum dikaitkan.

## Jalankan dengan Docker

1. Pasang dan jalankan Docker Desktop (Linux containers) atau Docker Engine + Compose.
2. Salin model ke `models/`: `behaviour_lgbm.joblib`, `feature_cols.joblib`,
   `label_encoder.joblib`. Pada laptop pengembangan model ada di `C:\Eco-Herd`;
   alternatif buat `.env` dari `.env.example` dan isi `MODEL_DIR=C:/Eco-Herd`.
3. Dari folder yang berisi `compose.yaml`, jalankan:

```powershell
docker compose up -d --build
docker compose ps
docker compose logs --tail 80 api
```

Build pertama memerlukan internet untuk mengunduh image/dependensi. Setelah image
terbangun, monitoring LAN dapat berjalan tanpa internet.

| Keperluan | Alamat default |
| --- | --- |
| Website di komputer server | `http://localhost:8080` |
| Website di HP | `http://IP_KOMPUTER:8080` |
| API lewat website/proxy | `http://IP_KOMPUTER:8080/api/health` |
| API langsung untuk ESP32-B | `http://IP_KOMPUTER:3001/api/telemetry/batch` |
| Status model | `http://localhost:8080/api/ai/status` |

Website Docker memakai alamat server halaman yang dibuka secara otomatis. Jika
browser pernah menyimpan alamat lain, buka **Pengaturan sensor → Gunakan alamat server
halaman ini → Simpan alamat API → Tes koneksi API tersimpan**. Kolom berisi alamat
dasar, misalnya `http://192.168.20.153:8080`, tanpa `/api`.

Jika port 3001 sedang dipakai `npm start` lama, hentikan melalui Ctrl+C pada terminal
backend itu sebelum menjalankan Compose. Jangan menjalankan dua backend berbeda
dan mengharapkan database yang sama. Port dapat diganti lewat `.env` (`API_PORT`,
`WEB_PORT`); URL pada B harus mengikuti API_PORT yang dipilih.

Database berada di **named volume `records`**. `docker compose down` mempertahankan
data; `docker compose down -v` menghapus volume beserta data. Model di-mount read-only.
Database lokal `backend/data` tidak otomatis dipindah ke volume Docker.

## Menyalin ke komputer lain

Paket source portabel bisa dibuat dari folder ini:

```powershell
python tools/export-portable.py --models "./models" --firmware "./firmware" --output "dist\Eco-Herd-portable.zip"
```

ZIP berisi Compose/Dockerfile, source web/backend/AI, tiga artefak model, dan
firmware. Cache, database operasional, `.env`, dan credential Wi-Fi tidak disertakan.
Script menolak menimpa ZIP yang sudah ada; gunakan nama baru untuk versi berikutnya.
Ekstrak ZIP pada komputer baru lalu jalankan `docker compose up -d --build` dari
folder `Eco-Herd`. Isi konfigurasi jaringan pada firmware untuk lokasi baru.

Docker menjalankan **website, API, dan AI di komputer**. ESP32 tetap menjalankan
firmware yang di-upload dengan PlatformIO. Firmware pada paket ada di `firmware/`.

## Data yang ditampilkan

- Database baru dimulai kosong. Tambah ternak melalui **Ternak → Tambah ternak**.
  ID/nama wajib, data ras/kandang/berat/kelamin opsional dan tidak diisi otomatis.
- Di **Pengaturan sensor**, pilih sensor yang benar lalu pasangkan ke ternak.
- Beranda, laporan CSV, daftar/detail sapi menggunakan database. Status perangkat
  berasal dari umur record dan flag validitas, bukan kesehatan yang dibuat-buat.
- Tidak ada daftar sapi, suhu, grafik metana, rekomendasi pakan, atau notifikasi
  contoh. Metana menunjukkan **belum tersedia**, bukan nilai nol palsu.
- Login/profil masih bersifat lokal per browser/perangkat; data ternak/sensor berada
  pada backend LAN bersama. Docker tidak mengubahnya menjadi akun multi-peternak.
- Audio sudah dinonaktifkan di firmware aktif dan tidak ditampilkan di website.

## Koneksi ESP32

Lihat [INTEGRASI_SENSOR.md](INTEGRASI_SENSOR.md) untuk konfigurasi A/B, penjelasan
log Wi-Fi/HTTP dan pemeriksaan koneksi dari HP. Perubahan firmware ini memerlukan
upload A (untuk mematikan pembacaan audio) dan B (untuk log/serializer terbaru).

## Model AI dan metana

Lihat [INTEGRASI_AI.md](INTEGRASI_AI.md). LightGBM saat ini memakai 37 fitur suhu dan
gerakan. Ekstraksi fitur masih eksperimental. File label yang diberikan salah isi,
jadi hasil masih ID kelas sampai file LabelEncoder asli tersedia.

`methane_proxy_rf.joblib` meminta menit makan/hari, menit ruminasi/hari, dan rasio
aktivitas. Model tersebut belum diaktifkan: definisi input, target/unit output,
asal label metana, dan akurasi terhadap pengukuran nyata harus diperiksa. Tidak
ada konversi sah langsung dari satu nilai suhu/XYZ menjadi gram CH4 per hari.

## Pengujian

```powershell
# Folder backend (native)
npm test

# Dengan container berjalan, termasuk model yang di-mount
docker compose exec api npm test
docker compose exec api /opt/venv/bin/python -m unittest discover -s ai -p "test_*.py" -v
```

Tes backend memakai database terpisah dan data sintetis. Itu memverifikasi jalur
software, bukan akurasi klasifikasi sapi atau komunikasi radio perangkat fisik.
