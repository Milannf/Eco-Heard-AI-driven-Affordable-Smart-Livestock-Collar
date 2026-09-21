import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';
import { useTelemetry } from '../context/TelemetryContext';

export function formatVector(vector, decimals = 1) {
  return vector ? ['x', 'y', 'z'].map(axis => vector[axis].toFixed(decimals)).join(', ') : 'Invalid';
}

export default function SensorRecords({ deviceId, cowId }) {
  const { baseUrl, request } = useTelemetry();
  const [page, setPage] = useState({ readings: [], next_before: null });
  const [before, setBefore] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!baseUrl || (!deviceId && !cowId)) return;
    let active = true;
    let timer;
    const load = async () => {
      const filter = deviceId ? `device_id=${encodeURIComponent(deviceId)}` : `cow_id=${encodeURIComponent(cowId)}`;
      try {
        const result = await request(`/api/readings?${filter}&limit=20${before ? `&before=${before}` : ''}`);
        if (active) { setPage(result); setError(''); setLoading(false); }
      } catch (failure) {
        if (active) { setError(failure.message); setLoading(false); }
      } finally {
        if (active && !before) timer = setTimeout(load, 5000);
      }
    };
    load();
    return () => { active = false; clearTimeout(timer); };
  }, [baseUrl, request, deviceId, cowId, before]);

  if (!baseUrl) return <Text style={styles.note}>Atur koneksi melalui Pengaturan sensor untuk melihat pembacaan.</Text>;
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Riwayat pembacaan</Text>
      <Text style={styles.note}>{before ? 'Halaman riwayat lama' : '20 record terbaru • diperbarui setiap 5 detik'}</Text>
      {!!error && <Text style={styles.error}>{error} Data yang tampil mungkin sudah lama.</Text>}
      {loading && <Text style={styles.note}>Memuat record...</Text>}
      {!loading && !error && page.readings.length === 0 && <Text style={styles.note}>Belum ada record untuk pilihan ini.</Text>}
      {page.readings.map(record => (
        <View key={record.id} style={styles.row}>
          <Text style={styles.label}>{new Date(record.observed_at).toLocaleString()}</Text>
          <Text style={styles.note}>Suhu sensor: {record.temperature_valid ? `${record.temperature_c.toFixed(2)} °C` : 'Tidak tersedia'}</Text>
          <Text style={styles.note}>Gerakan: {record.motion_valid ? 'Terbaca' : 'Tidak tersedia'}</Text>
        </View>
      ))}
      <View style={styles.actions}>
        {before && <Pressable onPress={() => { setLoading(true); setBefore(null); }} style={styles.button}>
          <Text style={styles.buttonText}>Terbaru</Text>
        </Pressable>}
        {!!page.next_before && <Pressable onPress={() => { setLoading(true); setBefore(page.next_before); }} style={styles.button}>
          <Text style={styles.buttonText}>Lebih lama</Text>
        </Pressable>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginTop: 16, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  note: { color: COLORS.textLight, fontSize: 12, lineHeight: 19 },
  error: { color: COLORS.danger, marginVertical: 8 },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  label: { color: COLORS.text, fontWeight: '600', marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  button: { padding: 12, backgroundColor: COLORS.primaryDark, borderRadius: RADIUS.sm },
  buttonText: { color: COLORS.surface, fontWeight: '600' },
});
