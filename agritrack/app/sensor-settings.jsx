import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SIZES } from '../constants/theme';
import { useTelemetry } from '../context/TelemetryContext';
import SensorRecords, { formatVector } from '../components/SensorRecords';
import { useRouter } from 'expo-router';
import BehaviourPrediction from '../components/BehaviourPrediction';

export default function SensorsScreen() {
  const { baseUrl, devices, livestock, error, request, saveBaseUrl, ready, defaultUrl } = useTelemetry();
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [selected, setSelected] = useState('');
  const [cowId, setCowId] = useState('');
  const [includeUnassigned, setIncludeUnassigned] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setUrl(baseUrl); }, [baseUrl]);
  const device = devices.find(item => item.device_id === selected);

  const saveAddress = async () => {
    setSaving(true);
    try {
      await saveBaseUrl(url);
      setSelected('');
      setMessage('Alamat API disimpan.');
    } catch (failure) { setMessage(failure.message); }
    finally { setSaving(false); }
  };
  const assign = async () => {
    const cow = livestock.find(item => item.id === cowId);
    if (!device || !cow) { setMessage('Pilih sensor dan sapi terlebih dahulu.'); return; }
    setSaving(true);
    try {
      await request(`/api/devices/${encodeURIComponent(device.device_id)}/assignment`, {
        method: 'PUT', body: JSON.stringify({
          cow_id: cow.id, cow_name: cow.display_id, include_unassigned: includeUnassigned,
        }),
      });
      setMessage(`Sensor dikaitkan ke ${cow.display_id}. Tampilan diperbarui maksimal 5 detik.`);
    } catch (failure) { setMessage(failure.message); }
    finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Pressable onPress={() => router.push('/')} style={styles.button}><Text style={styles.buttonText}>Kembali ke daftar sapi</Text></Pressable>
          <Text style={styles.title}>Koneksi aplikasi</Text>
          <Text style={styles.note}>Atur alamat server jika data belum muncul. Untuk koneksi USB, pastikan logger di laptop berjalan.</Text>
          <TextInput value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false}
            placeholder="http://192.168.1.10:3001" placeholderTextColor={COLORS.textMuted} style={styles.input} />
          <Pressable onPress={saveAddress} disabled={saving || !ready} style={styles.button}>
            <Text style={styles.buttonText}>{saving ? 'Menyimpan...' : 'Simpan alamat API'}</Text>
          </Pressable>
          <Pressable onPress={() => setUrl(defaultUrl())} style={styles.button}>
            <Text style={styles.buttonText}>Gunakan alamat server halaman ini</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={async () => {
            try {
              const health = await request('/api/health');
              setMessage(health.ok ? 'Koneksi berhasil. Pastikan logger di laptop berjalan untuk menerima data terbaru.' : 'Respons server tidak sesuai.');
            } catch (failure) { setMessage(`Tes koneksi gagal: ${failure.message}`); }
          }}><Text style={styles.buttonText}>Tes koneksi API tersimpan</Text></Pressable>
          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!message && <Text style={styles.note}>{message}</Text>}
        </View>

        <Text style={styles.title}>Sensor yang mengirim data</Text>
        {devices.length === 0 && <Text style={styles.note}>Belum ada sensor. Nyalakan perangkat dan jalankan logger di laptop.</Text>}
        {devices.map((item, index) => {
          const latest = item.latest;
          const stale = Date.now() - Date.parse(latest?.observed_at || item.last_seen) > 15000;
          return (
            <Pressable key={item.device_id} style={[styles.card, selected === item.device_id && styles.selected]}
              onPress={() => { setSelected(item.device_id); setCowId(item.cow_id || ''); setIncludeUnassigned(false); setMessage(''); }}>
              <Text style={styles.label}>Sensor {index + 1}{item.cow_name ? ` · Sapi ${item.cow_name}` : ''}</Text>
              <Text style={styles.note}>{item.cow_name || 'Belum dikaitkan ke sapi'} • {item.record_count} record</Text>
              <Text style={styles.note}>{error || stale ? 'Data lama / koneksi belum terverifikasi' : 'Data baru diterima'} • {new Date(item.last_seen).toLocaleString()}</Text>
              <Text style={styles.label}>Suhu: {latest?.temperature_valid ? `${latest.temperature_c.toFixed(2)} °C` : 'Invalid'}</Text>
              <Text style={styles.note}>A XYZ: {formatVector(latest?.acceleration_mg)} mg</Text>
              <Text style={styles.note}>G XYZ: {formatVector(latest?.gyro_rad_s, 3)} rad/s</Text>
            </Pressable>
          );
        })}

        {device && <>
          <BehaviourPrediction key={`ai-${baseUrl}-${selected}`} deviceId={selected} />
          <View style={styles.card}>
            <Text style={styles.title}>Kaitkan sensor ke sapi</Text>
            <Text style={styles.note}>Pilih sapi yang memakai sensor {devices.findIndex(item => item.device_id === selected) + 1}.</Text>
            <View style={styles.options}>
              {livestock.map(cow => <Pressable key={cow.id} onPress={() => setCowId(cow.id)}
                style={[styles.option, cowId === cow.id && styles.selected]}>
                <Text style={styles.label}>{cow.display_id}</Text>
              </Pressable>)}
            </View>
            {livestock.length === 0 && <Pressable onPress={() => router.push('/add-livestock')} style={styles.button}>
              <Text style={styles.buttonText}>Daftarkan ternak terlebih dahulu</Text>
            </Pressable>}
            <View style={styles.switchRow}>
              <Switch value={includeUnassigned} onValueChange={setIncludeUnassigned} />
              <Text style={[styles.note, { flex: 1 }]}>Sertakan record lama sensor ini yang belum memiliki sapi.</Text>
            </View>
            <Text style={styles.note}>Record milik sapi sebelumnya tidak dipindahkan saat collar diganti.</Text>
            <Pressable onPress={assign} disabled={saving} style={styles.button}>
              <Text style={styles.buttonText}>{saving ? 'Menyimpan...' : 'Simpan pasangan sensor–sapi'}</Text>
            </Pressable>
          </View>
          <SensorRecords key={`${baseUrl}-${selected}`} deviceId={selected} />
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SIZES.pagePadding, paddingBottom: 40 },
  card: { backgroundColor: COLORS.surface, padding: 16, borderRadius: RADIUS.lg, marginBottom: 16, borderWidth: 1, borderColor: COLORS.borderLight },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  label: { color: COLORS.text, fontWeight: '600', marginVertical: 4 },
  note: { color: COLORS.textLight, lineHeight: 20, fontSize: 13, marginVertical: 4 },
  error: { color: COLORS.danger, marginTop: 10 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 12, marginVertical: 12, color: COLORS.text },
  button: { backgroundColor: COLORS.primaryDark, borderRadius: RADIUS.sm, padding: 14, marginTop: 10 },
  buttonText: { color: COLORS.surface, fontWeight: '700', textAlign: 'center' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
  option: { padding: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm },
  selected: { borderColor: COLORS.primary, backgroundColor: COLORS.softGreen },
  switchRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
});
