import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTelemetry } from '../../context/TelemetryContext';
import SensorRecords, { formatVector } from '../../components/SensorRecords';
import BehaviourPrediction from '../../components/BehaviourPrediction';
import { Screen, Card, ConnectionNotice, LinkButton, fresh, temperatureText, ui } from '../../components/TelemetryUI';

export default function LivestockDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { livestock, devices, dataLoaded, baseUrl, error, request, refresh } = useTelemetry();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const removeCow = async () => {
    if (deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await request(`/api/livestock/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (failure) {
      setDeleteError(failure.message);
      setDeleting(false);
      return;
    }
    try { await refresh(); } catch { /* Polling retries the list refresh. */ }
    router.replace('/');
  };
  const [history, setHistory] = useState(false);
  const [analysis, setAnalysis] = useState(false);
  const cow = livestock.find(item => item.id === id);
  const collars = devices.filter(device => device.cow_id === id);
  return <Screen title={cow ? `Sapi ${cow.display_id}` : 'Detail sapi'}>
    <LinkButton href="/">‹ Daftar sapi</LinkButton>
    <ConnectionNotice />
    {dataLoaded && !cow && <Card title="Sapi tidak ditemukan"><Text style={ui.note}>Kembali ke daftar untuk memilih sapi yang terdaftar.</Text></Card>}
    {cow && <>
      <Card title="Informasi sapi">
        <Text style={ui.note}>Ras: {cow.breed || 'Belum diisi'}</Text>
        <Text style={ui.note}>Kandang: {cow.barn || 'Belum diisi'}</Text>
        <Text style={ui.note}>Jenis kelamin: {cow.sex || 'Belum diisi'}</Text>
        <Text style={ui.note}>Berat: {cow.weight_kg == null ? 'Belum diisi' : `${cow.weight_kg} kg`}</Text>
      </Card>
      {collars.length === 0 && <Card title="Sensor belum terhubung">
        <Text style={ui.note}>Hubungkan sensor untuk melihat suhu dan gerakan sapi ini.</Text>
        <LinkButton href="/sensor-settings">Hubungkan sensor</LinkButton>
      </Card>}
      {collars.map((device, index) => {
        const record = device.latest?.cow_id === id ? device.latest : null;
        const live = !error && fresh(record);
        return <Card key={device.device_id} title={collars.length > 1 ? `Pembacaan sensor ${index + 1}` : 'Pembacaan terbaru'}>
          <Text style={ui.note}>{error ? 'Koneksi terputus' : live ? 'Data terbaru diterima' : 'Menunggu data terbaru'}</Text>
          <Text style={ui.note}>{record ? `Pembaruan terakhir: ${new Date(record.observed_at).toLocaleString()}` : 'Belum ada pembacaan untuk sapi ini.'}</Text>
          <Text style={ui.heading}>Suhu sensor</Text>
          <Text style={ui.value}>{error ? 'Belum tersedia' : temperatureText(record)}</Text>
          <Text style={ui.note}>Suhu di lokasi pemasangan sensor, bukan pengukuran suhu inti tubuh.</Text>
          <View style={{ marginTop: 18 }}>
            <Text style={ui.heading}>Gerakan</Text>
            <Text style={ui.note}>{live && record.motion_valid ? 'Sensor gerakan terbaca' : 'Belum ada pembacaan gerakan terbaru'}</Text>
            {live && record.motion_valid && <>
              <Text style={ui.note}>Akselerasi (X, Y, Z): {formatVector(record.acceleration_mg)} mg</Text>
              <Text style={ui.note}>Rotasi (X, Y, Z): {formatVector(record.gyro_rad_s, 3)} rad/s</Text>
            </>}
          </View>
        </Card>;
      })}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: history }} style={ui.button} onPress={() => setHistory(!history)}>
        <Text style={ui.buttonText}>{history ? 'Tutup riwayat' : 'Lihat riwayat pembacaan'}</Text>
      </Pressable>
      {history && <SensorRecords key={`${baseUrl}-${id}`} cowId={id} />}
      {!!collars.length && <Pressable accessibilityRole="button" accessibilityState={{ expanded: analysis }} style={ui.button} onPress={() => setAnalysis(!analysis)}>
        <Text style={ui.buttonText}>{analysis ? 'Tutup analisis perilaku' : 'Analisis perilaku (eksperimental)'}</Text>
      </Pressable>}
      {analysis && collars.filter(device => device.latest?.cow_id === id).map(device => <BehaviourPrediction key={device.device_id} deviceId={device.device_id} />)}
      <View style={{ marginTop: 24 }}>
        {!confirmDelete ? <Pressable accessibilityRole="button" onPress={() => setConfirmDelete(true)} style={{ padding: 14 }}>
          <Text style={[ui.error, { textAlign: 'center' }]}>Hapus sapi</Text>
        </Pressable> : <Card title={`Hapus sapi ${cow.display_id}?`}>
          <Text style={ui.note}>Sapi akan dihapus dari daftar. Sensor akan dilepas dari sapi ini. Riwayat pembacaan tetap tersimpan sebagai data sensor yang belum dikaitkan.</Text>
          {!!deleteError && <Text accessibilityRole="alert" style={ui.error}>{deleteError}</Text>}
          <Pressable accessibilityRole="button" disabled={deleting} onPress={removeCow} style={[ui.button, { backgroundColor: '#B42318', opacity: deleting ? 0.6 : 1 }]}>
            <Text style={ui.buttonText}>{deleting ? 'Menghapus...' : 'Ya, hapus sapi'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={deleting} onPress={() => { setConfirmDelete(false); setDeleteError(''); }} style={ui.button}>
            <Text style={ui.buttonText}>Batal</Text>
          </Pressable>
        </Card>}
      </View>
    </>}
  </Screen>;
}
