# Hasil verifikasi perubahan monitoring dan Docker

Pengujian dilakukan pada 19 September 2026.

- Firmware `esp32doit-devkit-v1` (A) dan `esp32-b`: build PlatformIO **SUCCESS**.
- Image `eco-herd-web:local` dan `eco-herd-api:local`: berhasil dibuild.
- Compose pada project pengujian `eco-herd-verify`, port 18080/13001:
  kedua service **healthy**. Database dan port ini terpisah dari backend pengguna.
- Proxy `/api/health`, `/api/devices`, `/api/livestock`, `/api/ai/status`: HTTP 200.
- Deep link `/livestock/<id>` dilayani melalui fallback SPA Nginx.
- **8 tes backend** lulus di container Linux, termasuk ingest, retry/dedup, data
  invalid, daftar ternak kosong, pendaftaran ternak, CSV, persistence, dan model asli.
- **6 tes Python** lulus di container, termasuk perhitungan fitur dan probabilitas
  model. Tes kompatibilitas record audio lama tetap ada di backend; tidak ada
  pembacaan audio pada firmware aktif atau tampilan audio pada website baru.
- Uji browser Chromium pada build Docker: profil lokal, dashboard awal kosong,
  tambah ternak, reload detail, API same-origin otomatis, pasangan collar, hasil
  model pada kartu AI, metana kosong, laporan CSV, koneksi offline dan pemulihan.
- Restart container API mempertahankan ternak dan record di named volume.

Data browser/integrasi adalah **sintetis pada database pengujian terpisah**. Itu
tidak membuktikan akurasi perilaku/metana dan tidak menunjukkan bahwa firmware
baru sudah di-upload ke ESP32 fisik. Pengujian fisik berikutnya: upload A/B,
pastikan `[WiFi] B terhubung` dan `[API] ... HTTP 200`, lalu lihat record bertambah.

Artefak model masih membutuhkan LabelEncoder benar dan preprocessing pelatihan
asli. Kartu AI secara eksplisit menandai hasil eksperimental serta ID kelas tanpa
nama bila file label masih salah isi.
