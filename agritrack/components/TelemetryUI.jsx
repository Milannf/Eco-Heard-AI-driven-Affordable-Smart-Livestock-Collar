import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SIZES } from '../constants/theme';
import { useTelemetry } from '../context/TelemetryContext';

export function fresh(record) {
  const age = Date.now() - Date.parse(record?.observed_at || '');
  return Number.isFinite(age) && age >= -5000 && age < 15000;
}
export function temperatureText(record) {
  const age = Date.now() - Date.parse(record?.observed_at || '');
  return fresh(record) && record.temperature_valid && record.temperature_age_ms + Math.max(0, age) < 5000
    ? `${record.temperature_c.toFixed(2)} °C` : 'Belum ada suhu terbaru';
}
export function Screen({ title, children }) {
  return <SafeAreaView style={ui.screen} edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
      <Text style={ui.title}>{title}</Text>{children}
    </ScrollView>
  </SafeAreaView>;
}
export function Card({ title, children }) {
  return <View style={ui.card}>{!!title && <Text style={ui.heading}>{title}</Text>}{children}</View>;
}
export function LinkButton({ href, children }) {
  const router = useRouter();
  return <Pressable style={ui.button} onPress={() => router.push(href)}><Text style={ui.buttonText}>{children}</Text></Pressable>;
}
export function ConnectionNotice() {
  const { error, dataLoaded, baseUrl } = useTelemetry();
  return <View style={{ marginBottom: 12 }}>
    {!!error && <><Text style={ui.error}>Belum terhubung ke server. Data yang tampil adalah pembacaan sebelumnya.</Text><LinkButton href="/sensor-settings">Periksa koneksi</LinkButton></>}
    {!baseUrl && <LinkButton href="/sensor-settings">Hubungkan aplikasi</LinkButton>}
    {!dataLoaded && !error && <Text style={ui.note}>Memuat data sapi...</Text>}
  </View>;
}
export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SIZES.pagePadding, paddingBottom: 40, width: '100%', maxWidth: 1000, alignSelf: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.primaryDark, marginBottom: 18 },
  heading: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  card: { backgroundColor: COLORS.surface, padding: 20, borderRadius: RADIUS.lg, marginBottom: 16, borderWidth: 1, borderColor: COLORS.borderLight },
  note: { color: COLORS.textLight, fontSize: 14, lineHeight: 22, marginVertical: 4 },
  value: { color: COLORS.primaryDark, fontSize: 24, fontWeight: '700', marginVertical: 8 },
  error: { color: COLORS.danger, lineHeight: 22, marginVertical: 8 },
  input: { padding: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, backgroundColor: COLORS.surface, color: COLORS.text, marginBottom: 16 },
  button: { backgroundColor: COLORS.primaryDark, borderRadius: RADIUS.sm, padding: 14, marginVertical: 8 },
  buttonText: { color: COLORS.surface, fontWeight: '700', textAlign: 'center' },
});
