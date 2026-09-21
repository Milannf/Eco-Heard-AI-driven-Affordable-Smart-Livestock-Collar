import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';
import { useTelemetry } from '../context/TelemetryContext';

export default function BehaviourPrediction({ deviceId }) {
  const { request } = useTelemetry();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let timer;
    setResult(null);
    setError('');
    const poll = async () => {
      try {
        const next = await request(`/api/ai/behaviour?device_id=${encodeURIComponent(deviceId)}`);
        if (active) { setResult(next); setError(''); }
      } catch (failure) {
        if (active) { setResult(null); setError(failure.message); }
      } finally {
        if (active) timer = setTimeout(poll, 5000);
      }
    };
    poll();
    return () => { active = false; clearTimeout(timer); };
  }, [deviceId, request]);

  const prediction = result?.prediction;
  const metadata = result?.metadata;
  return (
    <View style={styles.card}>
      <Text style={styles.title}>AI Perilaku • Eksperimental</Text>
      <Text style={styles.note}>Model dijalankan di laptop. Preprocessing belum diverifikasi terhadap pelatihan.</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {!result && !error && <Text style={styles.note}>Meminta prediksi...</Text>}
      {!!result?.message && <Text style={styles.note}>{result.message}</Text>}
      {prediction && <>
        <Text style={styles.prediction}>{prediction.label || `Kelas ${prediction.class_id} (nama belum tersedia)`}</Text>
        <Text style={styles.note}>Skor probabilitas model: {(prediction.model_probability * 100).toFixed(1)}% — bukan akurasi terukur.</Text>
        <Text style={styles.note}>{result.window.samples} sampel • {result.window.duration_s.toFixed(1)} detik • {result.window.mean_fs_hz.toFixed(1)} Hz</Text>
        <Text style={styles.note}>Suhu rata-rata window: {result.window.temperature_mean_c.toFixed(2)} °C</Text>
        <Text style={styles.note}>Data: {new Date(result.window.observed_at).toLocaleString()}</Text>
      </>}
      {!!metadata?.label_issue && <Text style={styles.error}>{metadata.label_issue} Minta file LabelEncoder yang benar dari pembuat model, lalu restart backend.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.borderLight },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  prediction: { fontSize: 20, fontWeight: '700', color: COLORS.primaryDark, marginVertical: 10 },
  note: { color: COLORS.textLight, fontSize: 13, lineHeight: 20, marginVertical: 3 },
  error: { color: COLORS.danger, fontSize: 13, lineHeight: 20, marginVertical: 8 },
});
