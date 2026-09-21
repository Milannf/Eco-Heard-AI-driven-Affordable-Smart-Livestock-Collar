# Integrasi model perilaku dengan data ESP32

## Cara menjalankan pada laptop ini

1. Buka terminal di folder aplikasi **backend**:
   `C:\Project SFT\Eco-Heard-AI-driven-Affordable-Smart-Livestock-Collar\backend`.
2. Jalankan `npm start`. Bila backend lama sedang berjalan, hentikan dengan Ctrl+C
   di terminal miliknya lalu jalankan kembali. Python worker dimulai otomatis.
3. Buka `http://localhost:3001/api/ai/status`. Status `ready` berarti model termuat.
4. Nyalakan ESP32-A dan B. B harus tetap mengirim ke `/api/telemetry/batch` seperti
   sebelumnya. Data suhu dan gerakan harus valid. Tunggu sekitar 10 detik data
   kontinu; ada toleransi latensi/antrean, jadi tampilnya hasil bisa lebih lambat.
5. Di terminal folder **agritrack**, jalankan `npm run web`.
6. Buka **Record Sensor**, isi alamat backend seperti sebelumnya, lalu **pilih
   collar**. Kartu **AI Perilaku • Eksperimental** muncul di bawah daftar sensor.
   Kartu meminta hasil setiap 5 detik.

Environment Python 3.11 dan dependensi sudah dipasang di `backend/.venv` pada
laptop ini. Tidak perlu menyalin `.joblib` ke ESP32 atau mengupload ulang firmware
untuk integrasi ini: firmware yang sekarang sudah mengirim gerakan/suhu pada 10 Hz.
Laptop, backend, dan aplikasi harus tetap aktif untuk melihat hasil baru.

Alur:

```
Suhu + IMU -> ESP32-A -> ESP-NOW -> ESP32-B -> backend Node.js -> SQLite
                                                   |
                                           Python + LightGBM
                                                   |
                                     kartu AI pada Record Sensor
```

## Status model yang ditemukan di C:\Eco-Herd

| File | Hasil pemeriksaan versi terbaru |
| --- | --- |
| `behaviour_lgbm.joblib` | LGBMClassifier, **37 fitur**, 5 kelas numerik; dipakai untuk inferensi |
| `feature_cols.joblib` | 37 nama fitur, termasuk `mean_fs_hz`, `temp_mean`, `temp_std` |
| `behaviour_rf.joblib` | RandomForestClassifier, 37 fitur; alternatif, belum dijalankan |
| `label_encoder.joblib` | **Isinya RandomForestClassifier**, bukan LabelEncoder |
| `methane_proxy_rf.joblib` | Regresor dengan input `eating_min_per_day`, `rumination_min_per_day`, `activity_ratio` |

Artefak ini berbeda dari versi sebelumnya yang berisi 34 fitur. Daftar fitur
dibaca langsung dari `feature_cols.joblib`, tidak memakai daftar tulisan manual.

### Mengapa hasilnya "Kelas 0/1/2/3/4"?

File label yang diberikan salah isi. Sistem tidak menebak bahwa ID tertentu
berarti Eating/Resting/dll. Minta **LabelEncoder asli dari training 37 fitur**
kepada pembuat model dan ganti file `C:\Eco-Herd\label_encoder.joblib`, lalu restart
backend. Jangan membuat pemetaan dari urutan label model lama tanpa konfirmasi.
Loader memeriksa tipe encoder dan jumlah kelas, lalu dapat menampilkan nama
perilaku otomatis. Tetap pastikan encoder berasal dari training yang sama.

### Mengapa ditandai eksperimental?

Folder yang diberikan belum berisi notebook/script ekstraksi fitur. Integrasi ini
memakai **extractor prototipe yang eksplisit** supaya jalur data sampai model dapat
diuji. Rumus, unit, orientasi sensor, panjang window, scaler, dan preprocessing
belum diverifikasi terhadap pelatihan. Berhasil memanggil model dan skor tinggi
**tidak membuktikan perilaku sapi terklasifikasi dengan benar**.

Minta script ekstraksi fitur dan pasangan contoh data mentah -> 37 fitur dari
pembuat model. Cocokkan dengan `backend/ai/features.py`, lalu uji dengan data sapi
berlabel. Akurasi perilaku belum diukur oleh pengujian integrasi ini.

## Kontrak extractor prototipe v1

- Satu collar/gateway/sesi/sapi, **100 sampel terbaru** sekitar **10 Hz**.
  Rentang timestamp sampel pertama-terakhir normalnya 9,9 detik.
- Akselerasi **mg**, tetap mengandung gravitasi; sumbu mengikuti pemasangan sensor.
  Temperatur **°C**, mengikuti nilai DS18B20 terakhir yang dikirim A.
- Mean/std/min/max per sumbu dan magnitudo Euclidean. Std populasi (`ddof=0`).
- `*_energy`: rata-rata kuadrat, bukan jumlah kuadrat.
- `sma`: rata-rata `abs(x) + abs(y) + abs(z)`.
- `mean_fs_hz`: 1 / rata-rata selisih uptime A dalam detik.
- Jerk: norma Euclidean beda XYZ dibagi selisih waktu aktual, dalam mg/s.
- ZCR: perubahan tanda sumbu setelah mean dikurangi, dibagi `N-1`.
- Korelasi: Pearson, pasangan sumbu konstan menghasilkan 0.
- Spektrum: magnitudo diinterpolasi linear ke N timestamp seragam di dalam window,
  mean dikurangi, `rfft` tanpa taper/normalisasi; power = `abs(FFT)^2`, bin DC=0,
  spektrum satu sisi tidak dikali dua. Frekuensi dominan dalam Hz, energi=sum(power).
- Entropi spektral: Shannon `-sum(p*log2(p))`, tanpa normalisasi terhadap jumlah bin.
  Sinyal konstan menghasilkan frekuensi/energi/entropi 0.
- `temp_mean/temp_std`: dihitung atas nilai suhu pada seluruh 100 paket. Nilai suhu
  yang di-hold antar-konversi tetap termasuk; bukan hanya konversi suhu yang unik.
- Tidak ada scaler, filter tambahan, penghilangan gravitasi, ataupun imputasi.

Window ditolak jika ada sensor invalid, umur suhu >5 detik, paket hilang/duplikat,
reset/sesi/collar/sapi berganti, atau interval di luar 50–200 ms / rata-rata di luar
8–12 Hz. Uptime dan seq uint32 wrap didukung. Data terbaru >15 detik ditandai lama.
Window setelah gangguan harus kembali berisi 100 paket kontinu; data kosong tidak
diganti nol. Endpoint memakai urutan record tersimpan, tidak mengarang sampel yang
tidak diterima oleh backend.

Prediksi dihitung saat kartu/API meminta, menggunakan data SQLite terbaru. Hasil
AI belum disimpan sebagai riwayat prediksi harian. Fitur methane tidak diaktifkan:
inputnya membutuhkan ringkasan aktivitas harian, label perilaku yang benar, serta
definisi rasio aktivitas dan unit output dari pembuat model. Audio tidak menjadi
input model 37 fitur ini.

## Konfigurasi dan instalasi di komputer baru

Backend membaca `.env` jika tersedia; contoh ada di `backend/.env.example`:

```dotenv
AI_MODEL_DIR=C:/Eco-Herd
AI_ENABLED=1
# AI_PYTHON=C:/path/to/python.exe
```

Default Python adalah executable di `backend/.venv`. Untuk instalasi baru, pakai
Python **3.11 atau 3.12**; scikit-learn 1.6.1 sesuai versi di artefak. Dari backend:

```powershell
py -3.11 -m venv .venv
& ".\.venv\Scripts\python.exe" -m pip install -r ai/requirements.txt
& ".\.venv\Scripts\python.exe" ai/worker.py --model-dir "C:\Eco-Herd" --check
npm start
```

Python milik PlatformIO 3.11 juga dapat dipakai hanya untuk **membuat** virtualenv
terpisah; dependensi AI tidak dipasang ke environment PlatformIO.

## Endpoint dan status

| Endpoint | Fungsi |
| --- | --- |
| `GET /api/ai/status` | Status worker dan metadata model/fitur/masalah label |
| `GET /api/ai/behaviour?device_id=<MAC-A>` | Prediksi window terbaru dari satu collar |

Contoh MAC yang tercatat pada panduan sensor:
`http://localhost:3001/api/ai/behaviour?device_id=68%3A09%3A47%3A4C%3AF2%3A54`.
Gunakan MAC collar yang benar dari `/api/devices`.

- `loading`: model sedang dimuat.
- `waiting`: belum cukup data atau window melewati perubahan sesi/collar/sapi.
- `invalid_sensor`: salah satu sensor invalid/suhu terlalu lama.
- `data_gap`: paket terlewat atau interval tidak sesuai.
- `stale`: data lama; prediksi lama tidak ditampilkan sebagai hasil terkini.
- `experimental`: prediksi numerik tersedia, preprocessing belum tervalidasi.
- `model_error`: Python/dependensi/model/fitur bermasalah; periksa pesan/log backend.
- `disabled`: worker dimatikan.

Kegagalan Python tidak menghentikan penerimaan/penyimpanan sensor. Worker berjalan
terpisah, model dimuat sekali, dan antrean inferensi dibatasi. Model/config baru
memerlukan restart backend. Tampilan menghapus hasil saat koneksi gagal atau window
baru invalid agar hasil lama tidak dianggap sebagai prediksi baru.

## Pengujian

Dari folder backend:

```powershell
$env:AI_MODEL_DIR = "C:\Eco-Herd"
& ".\.venv\Scripts\python.exe" -m unittest discover -s ai -p "test_*.py" -v
npm test
```

Tes Python memeriksa gravitasi statis, sinus 1 Hz/energi FFT, korelasi/ZCR, uint32
wrap, invalid/gap/reset/sesi, serta kesetaraan probabilitas Booster dengan wrapper
model asli. Tes Node mengirim **data sintetis** ke HTTP, menyimpannya ke SQLite
in-memory, memanggil worker nyata dan `.joblib`, lalu memeriksa respons/dedup/error.
Tes ini tidak menyuntikkan data contoh ke database operasional dan tidak mengukur
akurasi klasifikasi sapi. Tes model Node dilewati bila Python/model tidak tersedia.
