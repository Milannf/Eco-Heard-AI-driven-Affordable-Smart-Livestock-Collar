import { Text } from 'react-native';
import { useTelemetry } from '../../context/TelemetryContext';
import { Screen, Card, ConnectionNotice, fresh, ui } from '../../components/TelemetryUI';

export default function NotificationsScreen() {
  const { devices, dataLoaded, error } = useTelemetry();
  const issues = devices.flatMap((device, index) => {
    const prefix = device.cow_name ? `Sapi ${device.cow_name}` : `Sensor ${index + 1}`;
    if (!fresh(device.latest)) return [`${prefix}: belum menerima data baru dalam 15 detik.`];
    return [!device.latest.temperature_valid && `${prefix}: pembacaan suhu invalid.`,
      !device.latest.motion_valid && `${prefix}: pembacaan gerakan invalid.`].filter(Boolean);
  });
  return <Screen title="Status perangkat">
    <ConnectionNotice />
    <Text style={ui.note}>Status dari record terbaru. Ini bukan diagnosis kesehatan atau riwayat notifikasi.</Text>
    {!error && issues.map(message => <Card key={message}><Text style={ui.note}>{message}</Text></Card>)}
    {dataLoaded && !error && issues.length === 0 && <Card>
      <Text style={ui.note}>{devices.length ? 'Tidak ada masalah validitas/koneksi yang terdeteksi pada record terbaru.' : 'Belum ada perangkat yang mengirim data.'}</Text>
    </Card>}
  </Screen>;
}
