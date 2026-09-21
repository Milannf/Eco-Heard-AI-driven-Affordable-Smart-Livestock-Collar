#pragma once

#include <Arduino.h>

const char DASHBOARD_HTML[] PROGMEM = R"HTML(
<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Eco-Herd | Monitor Sensor</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f1f5f2; color: #19352b; font-family: system-ui, sans-serif; }
    main { max-width: 850px; margin: auto; padding: 28px 18px; }
    h1 { margin-bottom: 4px; }
    h2 { font-size: 1.15rem; margin-top: 0; }
    p { line-height: 1.5; }
    .muted { color: #51675e; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 18px; }
    .card { padding: 22px; background: white; border: 1px solid #d7e3db; border-radius: 16px; }
    .status { display: inline-block; padding: 6px 10px; border-radius: 8px; background: #eef1ef; font-size: .9rem; }
    .ok { background: #dcf5e5; color: #155a35; }
    .error { background: #ffe8e5; color: #942b20; }
    .temperature { margin: 24px 0; font-size: 2.7rem; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
    caption { text-align: left; color: #51675e; margin-bottom: 8px; }
    th, td { text-align: right; padding: 9px 4px; border-bottom: 1px solid #edf1ee; }
    th:first-child { text-align: left; }
    footer { margin-top: 22px; font-size: .9rem; }
  </style>
</head>
<body>
<main>
  <h1>Eco-Herd</h1>
  <p class="muted">Monitoring sensor collar sapi melalui Wi-Fi ESP32.</p>
  <p id="connection" class="status" role="status">Menghubungkan ke ESP32...</p>
  <div class="grid">
    <section class="card">
      <h2>Suhu &middot; DS18B20</h2>
      <span id="temperature-status" class="status">Menunggu data</span>
      <div class="temperature"><span id="temperature">--</span> &deg;C</div>
      <p class="muted">Suhu yang terukur pada probe DS18B20.</p>
    </section>
    <section class="card">
      <h2>Gerakan &middot; IMU</h2>
      <span id="motion-status" class="status">Menunggu data</span>
      <table>
        <caption>Akselerasi dan kecepatan sudut</caption>
        <thead><tr><th>Sumbu</th><th>m/s&sup2;</th><th>rad/s</th></tr></thead>
        <tbody>
          <tr><th>X</th><td id="ax">--</td><td id="gx">--</td></tr>
          <tr><th>Y</th><td id="ay">--</td><td id="gy">--</td></tr>
          <tr><th>Z</th><td id="az">--</td><td id="gz">--</td></tr>
        </tbody>
      </table>
      <p class="muted">Akselerasi mencakup gravitasi.</p>
    </section>
  </div>
  <footer class="muted">
    <p id="updated">Belum ada pembaruan.</p>
    <p>Data diperbarui sekitar setiap 1 detik. Jaringan lokal ini tidak memerlukan internet.</p>
  </footer>
  <noscript>Aktifkan JavaScript di browser untuk melihat pembacaan sensor.</noscript>
</main>
<script>
  const axes = ['ax', 'ay', 'az', 'gx', 'gy', 'gz'];
  const element = id => document.getElementById(id);

  function setStatus(id, text, ok) {
    const target = element(id);
    target.textContent = text;
    target.className = 'status ' + (ok ? 'ok' : 'error');
  }

  function fresh(sensor) {
    return sensor.ok && Number.isFinite(sensor.age_ms) && sensor.age_ms < 5000;
  }

  async function refresh() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch('/api/sensors', { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      const temperatureOk = fresh(data.temperature) && Number.isFinite(data.temperature.celsius);
      const motionOk = fresh(data.motion) && axes.every(axis => Number.isFinite(data.motion[axis]));
      element('temperature').textContent = temperatureOk ? data.temperature.celsius.toFixed(2) : '--';
      for (const axis of axes) {
        element(axis).textContent = motionOk ? data.motion[axis].toFixed(2) : '--';
      }
      setStatus('temperature-status', temperatureOk ? 'Sensor aktif' : 'Belum ada data valid / sensor terputus', temperatureOk);
      setStatus('motion-status', motionOk ? 'Sensor aktif' : 'Belum ada data valid / periksa sensor', motionOk);
      setStatus('connection', 'ESP32 terhubung | Perangkat Wi-Fi: ' + data.clients, true);
      element('updated').textContent = 'Pembaruan terakhir: ' + new Date().toLocaleTimeString('id-ID');
    } catch (error) {
      element('temperature').textContent = '--';
      for (const axis of axes) element(axis).textContent = '--';
      setStatus('connection', 'ESP32 tidak terjangkau. Periksa koneksi Wi-Fi.', false);
      setStatus('temperature-status', 'Data tidak tersedia', false);
      setStatus('motion-status', 'Data tidak tersedia', false);
    } finally {
      clearTimeout(timeout);
      // Tunggu permintaan selesai agar koneksi lambat tidak menumpuk request.
      setTimeout(refresh, 1000);
    }
  }

  refresh();
</script>
</body>
</html>
)HTML";
