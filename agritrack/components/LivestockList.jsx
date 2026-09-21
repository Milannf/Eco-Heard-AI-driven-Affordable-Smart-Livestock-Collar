import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTelemetry } from '../context/TelemetryContext';
import { Screen, Card, ConnectionNotice, fresh, temperatureText, ui } from './TelemetryUI';
import { COLORS, RADIUS } from '../constants/theme';

export default function LivestockList() {
  const router = useRouter();
  const { livestock, devices, dataLoaded, error } = useTelemetry();
  const [search, setSearch] = useState('');
  const filtered = livestock.filter(cow => `${cow.display_id} ${cow.breed} ${cow.barn}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <Screen title="Sapi saya">
    <Text style={ui.note}>Pilih sapi untuk melihat informasi dan pembacaan sensornya.</Text>
    <View style={styles.toolbar}>
      <Pressable accessibilityRole="button" onPress={() => router.push('/add-livestock')} style={ui.button}>
        <Text style={ui.buttonText}>+ Tambah sapi</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/sensor-settings')} style={styles.settings}>
        <Text style={styles.link}>Pengaturan sensor</Text>
      </Pressable>
    </View>
    <ConnectionNotice />
    <TextInput accessibilityLabel="Cari sapi" style={ui.input} value={search} onChangeText={setSearch}
      placeholder="Cari nama sapi atau kandang" placeholderTextColor={COLORS.textMuted} />
    {dataLoaded && <Text style={ui.note}>{filtered.length} sapi{search.trim() ? ' ditemukan' : ' terdaftar'}</Text>}
    {dataLoaded && !filtered.length && <Card title={livestock.length ? 'Sapi tidak ditemukan' : 'Belum ada sapi'}>
      <Text style={ui.note}>{livestock.length ? 'Coba nama atau kandang lain.' : 'Tambahkan sapi pertama Anda, lalu hubungkan sensornya melalui Pengaturan sensor.'}</Text>
    </Card>}
    {filtered.map(cow => {
      const collars = devices.filter(device => device.cow_id === cow.id);
      const latest = collars.map(device => device.latest).filter(record => record?.cow_id === cow.id)
        .sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at))[0];
      const live = !error && fresh(latest);
      return <Pressable key={cow.id} accessibilityRole="button" accessibilityLabel={`Lihat sapi ${cow.display_id}`}
        onPress={() => router.push(`/livestock/${cow.id}`)}
        style={({ pressed }) => [styles.cow, pressed && { opacity: 0.75 }]}>
        <View style={styles.row}>
          <View style={styles.identity}>
            <Text style={styles.name}>Sapi {cow.display_id}</Text>
            <Text style={ui.note}>{[cow.breed, cow.barn && `Kandang ${cow.barn}`].filter(Boolean).join(' · ') || 'Informasi belum dilengkapi'}</Text>
          </View>
          <Text style={[styles.badge, live && styles.live]}>{error ? 'Koneksi terputus' : live ? 'Data terbaru' : collars.length ? 'Menunggu data' : 'Belum terhubung'}</Text>
        </View>
        <View style={styles.row}>
          <View><Text style={ui.note}>Suhu sensor</Text><Text style={styles.temperature}>{error ? 'Belum tersedia' : temperatureText(latest)}</Text></View>
          <Text style={styles.link}>Lihat detail ›</Text>
        </View>
      </Pressable>;
    })}
  </Screen>;
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 20, marginVertical: 8 },
  settings: { paddingVertical: 14 },
  link: { color: COLORS.primaryDark, fontWeight: '600', fontSize: 14 },
  cow: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: RADIUS.lg, padding: 20, marginTop: 12, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  identity: { flexGrow: 1, flexShrink: 1 },
  name: { fontSize: 21, fontWeight: '700', color: COLORS.primaryDark },
  temperature: { color: COLORS.primaryDark, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  badge: { backgroundColor: COLORS.background, color: COLORS.textLight, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, fontSize: 12 },
  live: { backgroundColor: COLORS.softGreen, color: COLORS.primaryDark },
});
