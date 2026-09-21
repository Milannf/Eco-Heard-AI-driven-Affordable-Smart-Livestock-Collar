import { useState } from 'react';
import { Linking, Pressable, Text } from 'react-native';
import { useTelemetry } from '../../context/TelemetryContext';
import { Screen, Card, ConnectionNotice, ui } from '../../components/TelemetryUI';

export default function ReportsScreen() {
  const { livestock, devices, baseUrl, dataLoaded } = useTelemetry();
  const [error, setError] = useState('');
  async function download() {
    try { await Linking.openURL(`${baseUrl}/api/reports/livestock.csv`); }
    catch (failure) { setError(failure.message); }
  }
  return <Screen title="Laporan data tersimpan">
    <ConnectionNotice />
    <Card title="Ringkasan database">
      <Text style={ui.note}>Total ternak: {dataLoaded ? livestock.length : '—'}</Text>
      <Text style={ui.note}>Total record seluruh collar: {dataLoaded ? devices.reduce((sum, item) => sum + item.record_count, 0) : '—'}</Text>
      <Text style={ui.note}>Jumlah mencakup seluruh waktu penyimpanan, bukan laporan harian.</Text>
      {dataLoaded && livestock.length > 0 && <Pressable style={ui.button} onPress={download}>
        <Text style={ui.buttonText}>Unduh daftar ternak & jumlah record (CSV)</Text>
      </Pressable>}
      {!!error && <Text style={ui.error}>{error}</Text>}
    </Card>
    {livestock.map(cow => <Card key={cow.id} title={cow.display_id}>
      <Text style={ui.note}>{cow.record_count} record terkait sapi ini.</Text>
    </Card>)}
    {dataLoaded && livestock.length === 0 && <Text style={ui.note}>Belum ada data ternak untuk dilaporkan.</Text>}
  </Screen>;
}
