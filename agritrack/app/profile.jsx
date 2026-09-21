import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Screen, Card, LinkButton, ui } from '../components/TelemetryUI';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  async function logout() {
    try { await signOut(); router.replace('/(auth)/login'); }
    catch (failure) { setError(failure.message); }
  }
  return <Screen title="Profil lokal">
    <Card title="Informasi yang Anda daftarkan">
      {[['Nama', user?.name], ['Email', user?.email], ['Telepon', user?.phone], ['Peternakan', user?.farmName]].map(([label, value]) =>
        <Text key={label} style={ui.note}>{label}: {value || 'Belum diisi'}</Text>)}
      <Text style={ui.note}>Profil/login tersimpan pada browser/perangkat ini. Database ternak dan sensor berada di backend bersama.</Text>
    </Card>
    <LinkButton href="/sensors">Pengaturan koneksi API</LinkButton>
    {!!error && <Text style={ui.error}>{error}</Text>}
    <Pressable onPress={logout} style={ui.button}><Text style={ui.buttonText}>Keluar</Text></Pressable>
  </Screen>;
}
