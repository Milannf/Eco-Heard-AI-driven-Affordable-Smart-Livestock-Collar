# Koneksi ESP32 ke Eco-Herd

```
DS18B20 + IMU -> ESP32-A -> ESP-NOW -> ESP32-B -> router -> API/SQLite -> website
```

## 1. Jalankan server

Pilihan Docker: `docker compose up -d --build` dari folder aplikasi. Website pada
port 8080 dan API langsung pada port 3001. Lihat README.md untuk model dan volume.

Pilihan native: `npm start` dari `backend`, lalu `npm run web` dari `agritrack`.
Website dev mengarahkan default API ke hostname yang sama pada port 3001.

Pastikan `http://IP_KOMPUTER:3001/api/health` memberi `{"ok":true}` **dari HP pada
router yang sama**, bukan hanya dari komputer server. Docker juga menyediakan
`http://IP_KOMPUTER:8080/api/health` lewat proxy.

## 2. Konfigurasi gateway B

Edit `include/gateway_config.h` di proyek firmware:

```cpp
constexpr char GATEWAY_WIFI_SSID[] = "SSID_ROUTER";
constexpr char GATEWAY_WIFI_PASSWORD[] = "PASSWORD_ROUTER";
constexpr char GATEWAY_API_URL[] = "http://IP_KOMPUTER:3001/api/telemetry/batch";
constexpr char GATEWAY_ROOT_CA[] = "";
```

Gunakan **IP komputer server**, bukan IP B, `localhost`, atau IP AP A 192.168.4.1.
Pada pemeriksaan laptop pengembangan IP server 192.168.20.153 dan router kanal 8;
IP/kanal pada komputer/jaringan lain bisa berbeda. Reservasi DHCP router membantu
mencegah IP komputer berganti. Firmware B perlu di-upload ulang setelah URL berubah.

A, B, dan router **2.4 GHz harus sama-sama memakai kanal tetap** pada
`include/sensor_packet.h`. Konfigurasi proyek saat ini `ESPNOW_CHANNEL = 8`.
Jangan hubungkan HP ke AP A untuk mengakses backend router kecuali ada rute jaringan;
AP A hanya melayani dashboard sensor langsung `http://192.168.4.1`.

## 3. Upload

Tutup Serial Monitor. Dari proyek firmware, ganti port sesuai board:

```powershell
pio run -e esp32doit-devkit-v1 -t upload --upload-port COM_A
pio run -e esp32-b -t upload --upload-port COM_B
pio device monitor --port COM_B --baud 115200
```

Upload default proyek adalah A. Untuk B wajib memilih environment `esp32-b`.

## 4. Arti log terbaru B

1. `[ESP-NOW] ... kanal 8` dan `RX`: B menerima A; belum membuktikan koneksi router/API.
2. `[WiFi] Menghubungkan ...`: percobaan jaringan dimulai; timeout 20 detik, retry
   30 detik dari awal percobaan. Timeout mengembalikan kanal radio ke kanal ESP-NOW.
3. `[WiFi] B terhubung ...`: B memperoleh IP router. Cek kanal harus sama dengan A.
4. `[API] Tersimpan/diakui ... (HTTP 200)`: backend menerima batch.
5. `[Status B]` setiap 5 detik memuat jumlah paket RX, status Wi-Fi, kanal, dan
   kode alasan disconnect terakhir. Kode terakhir dapat berasal dari percobaan
   sebelumnya, bukan selalu kesalahan koneksi saat ini.

Snapshot RX dicetak **satu kali per detik**; semua sampel tetap masuk antrean upload
pada sekitar 10 Hz. Karena itu lompatan nomor pada baris RX baru **tidak otomatis
berarti paket hilang**. Log radio/status tidak lagi tertutup 10 baris sensor/detik.

### Jika belum terhubung

| Gejala | Langkah |
| --- | --- |
| Banyak RX, API menunggu Wi-Fi | Periksa SSID/password/router 2.4 GHz dan log timeout/reason |
| Kanal berbeda | Samakan kanal tetap router/A/B lalu upload kedua board |
| HTTP -1 / connection failed | Tes health dari HP, cek IP tujuan, server/port/firewall/router isolation |
| HTTP 404 | URL harus `/api/telemetry/batch`, bukan `/api` atau halaman web |
| HTTP 400/422 | Lihat alasan payload ditolak; jangan terus retry data invalid |
| Website bisa dibuka, sensor kosong | Belum ada batch diterima backend yang sedang dibuka; cek log HTTP 200 |
| API berbeda-beda | Pastikan HP dan B menuju instance backend yang sama, bukan native vs Docker berbeda |

Backend diuji bind pada `0.0.0.0`; health lokal berhasil tidak membuktikan akses dari
HP/B. Router guest/client-isolation dapat menghalangi komunikasi LAN antarklien.
Jika health lokal berhasil tetapi HP gagal, izinkan port server yang digunakan.
Contoh **PowerShell Administrator** untuk mengizinkan hanya subnet lokal:

```powershell
New-NetFirewallRule -DisplayName "Eco-Herd LAN" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3001,8080 -RemoteAddress LocalSubnet
```

Tidak perlu mematikan seluruh firewall. Pada log yang dianalisis sebelumnya,
backend hidup tetapi `/api/devices` masih kosong; penyebab akhir dari jalur B ke
server perlu dibuktikan melalui log koneksi/HTTP setelah firmware di-upload.

## 5. Website tanpa data contoh

Daftarkan sapi melalui **Tambah ternak**, lalu pada **Record Sensor** pasangkan
MAC collar ke sapi tersebut. Pasangan dan ternak tersimpan di SQLite. Riwayat lama
tanpa sapi bisa diikutsertakan; record milik sapi lain tidak dipindahkan.

API utama: `/api/devices`, `/api/livestock`, `/api/readings?device_id=MAC`,
`/api/readings?cow_id=ID`, `/api/reports/livestock.csv`. Riwayat memakai cursor
`before` dengan limit maksimal 200. Record tidak digandakan saat batch di-retry.

Suhu dalam °C, akselerasi dalam mg, giroskop rad/s. Timestamp `observed_at` adalah
estimasi waktu terima B dari waktu server dikurangi umur antrean, bukan timestamp
presisi pengukuran A. Uptime/seq A ikut disimpan untuk pemeriksaan window AI.

## Audio dan buffer

Firmware aktif tidak memulai I2S, membaca, atau memeriksa INMP441. Log dan dashboard
audio dihapus. Layout radio v2/68 byte tetap sama agar kompatibel; field audio
kosong. B mengirim **JSON v1 tanpa audio**. Backend tetap dapat membaca record v2
lama tanpa memaksa penghapusan database.

Antrean RAM B: 200 sampel + batch maksimum 10 sampel. Offline berkepanjangan akan
memenuhi antrean dan melewatkan sampel baru; kehilangan daya menghilangkan buffer.
Penyimpanan permanen dimulai ketika backend mengakui HTTP 200.
