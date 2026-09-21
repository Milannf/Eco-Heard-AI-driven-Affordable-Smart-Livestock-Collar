import { Text } from 'react-native';
import { Screen, Card, LinkButton, ui } from '../components/TelemetryUI';

export default function MethaneScreen() {
  return <Screen title="Estimasi metana">
    <Card title="Belum tersedia">
      <Text style={ui.note}>Sensor saat ini mengukur suhu dan gerakan, bukan gas metana. Belum ada hasil emisi dalam liter atau gram per hari yang tervalidasi.</Text>
      <Text style={ui.note}>Model methane_proxy_rf memerlukan durasi makan, durasi ruminasi per hari, dan rasio aktivitas. Input ini belum tersedia sebagai agregasi perilaku harian yang tervalidasi.</Text>
      <Text style={ui.note}>Gerakan dapat membantu mengenali perilaku. Estimasi emisi membutuhkan data pembanding metana, informasi pakan/asupan, definisi unit output, dan validasi model pada sapi lain.</Text>
      <LinkButton href="/sensors">Lihat data sensor & status AI</LinkButton>
    </Card>
  </Screen>;
}
