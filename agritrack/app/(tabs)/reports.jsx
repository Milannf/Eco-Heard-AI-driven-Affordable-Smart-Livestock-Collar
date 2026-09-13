import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SIZES, RADIUS, SHADOWS } from '../../constants/theme';
import {
  Calendar,
  CircleAlert,
  Download,
  Users,
  ChartBar,
  HeartPulse,
  Activity,
} from 'lucide-react-native';
import { MOCK_LIVESTOCK } from '../../data/livestock';
import { useAuth } from '../../context/AuthContext';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const MOCK_FARMERS = [
  { id: '1', name: 'Budi Santoso', cattle: 24, status: 'Sehat' },
  { id: '2', name: 'Asep Supriatna', cattle: 20, status: 'Perlu Cek' },
  { id: '3', name: 'Siti Aminah', cattle: 18, status: 'Sehat' },
  { id: '4', name: 'Maman Abdurrahman', cattle: 12, status: 'Kritis' },
];

const MOCK_METHANE = [
  { name: 'A. Supriatna', value: 42 },
  { name: 'B. Santoso', value: 38 },
  { name: 'S. Aminah', value: 35 },
  { name: 'D. Maman', value: 32 },
];

function getFarmerStatus(status) {
  if (status === 'Sehat') return { color: COLORS.success, bg: COLORS.successBg };
  if (status === 'Perlu Cek') return { color: COLORS.warning, bg: COLORS.warningBg };
  return { color: COLORS.danger, bg: COLORS.dangerBg };
}

export default function ReportsScreen() {
  const { user } = useAuth();
  
  const totalLivestock = MOCK_LIVESTOCK.length;
  const healthyCount = MOCK_LIVESTOCK.filter(c => c.healthStatus === 'Sehat').length;
  const attentionCount = MOCK_LIVESTOCK.filter(c => c.healthStatus === 'Perlu Perhatian').length;
  const criticalCount = MOCK_LIVESTOCK.filter(c => c.healthStatus === 'Kritis').length;

  const totalMethaneToday = MOCK_LIVESTOCK.reduce((acc, c) => acc + (c.methaneEmissionToday || 0), 0);
  const avgMethane = totalLivestock > 0 ? Math.round(totalMethaneToday / totalLivestock) : 0;
  
  const healthPercent = totalLivestock > 0 ? Math.round((healthyCount / totalLivestock) * 100) : 0;

  const handleExport = async () => {
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const today = new Date().toLocaleDateString('id-ID');

      // A. INFORMASI LAPORAN
      const sectionA = [
        `AgriTrack - Laporan Monitoring Peternakan`,
        ``,
        `A. INFORMASI LAPORAN`,
        `Nama Peternakan,${user?.farmName || 'Peternakan Saya'}`,
        `Nama Pengguna,${user?.name || 'Peternak'}`,
        `Lokasi,${user?.location || 'Indonesia'}`,
        `Tanggal Laporan,${today}`,
        `Periode Laporan,Harian`,
        ``
      ].join('\n');

      // B. RINGKASAN TERNAK
      const sectionB = [
        `B. RINGKASAN TERNAK`,
        `Total Ternak,${totalLivestock}`,
        `Ternak Sehat,${healthyCount}`,
        `Perlu Perhatian,${attentionCount}`,
        `Kritis,${criticalCount}`,
        ``
      ].join('\n');

      // C. DETAIL TERNAK
      const headersC = ['ID Ternak', 'Ras', 'Jenis Kelamin', 'Kandang', 'Umur', 'Berat (kg)', 'Suhu (C)', 'Aktivitas', 'Status Kesehatan'];
      const rowsC = MOCK_LIVESTOCK.map(c =>
        `${c.displayId},${c.breed},${c.sex},${c.barn},${c.age},${c.weight},${c.temperature},${c.activity},${c.healthStatus}`
      );
      const sectionC = [
        `C. DETAIL TERNAK`,
        headersC.join(','),
        ...rowsC,
        ``
      ].join('\n');

      // D. RINGKASAN KESEHATAN
      const sectionD = [
        `D. RINGKASAN KESEHATAN`,
        `Jumlah Ternak Sehat,${healthyCount}`,
        `Jumlah Yang Memerlukan Perhatian,${attentionCount}`,
        `Jumlah Ternak Kritis,${criticalCount}`,
        `Persentase Kesehatan Ternak,${healthPercent}%`,
        ``
      ].join('\n');

      // E. RINGKASAN EMISI METANA
      const highestEmitter = [...MOCK_LIVESTOCK].sort((a, b) => (b.methaneEmissionToday || 0) - (a.methaneEmissionToday || 0))[0];
      const sectionE = [
        `E. RINGKASAN EMISI METANA (Estimasi)`,
        `Total Estimasi Emisi Metana,${totalMethaneToday} L`,
        `Rata-rata Emisi Per Ternak,${avgMethane} L`,
        `Ternak Dengan Emisi Tertinggi,${highestEmitter ? highestEmitter.displayId : '-'} (${highestEmitter ? highestEmitter.methaneEmissionToday : 0} L)`,
        ``
      ].join('\n');

      // F. TERNAK YANG MEMERLUKAN PERHATIAN
      const attentionCattle = MOCK_LIVESTOCK.filter(c => c.healthStatus === 'Perlu Perhatian' || c.healthStatus === 'Kritis');
      const headersF = ['ID Ternak', 'Status', 'Suhu (C)', 'Aktivitas'];
      const rowsF = attentionCattle.map(c => `${c.displayId},${c.healthStatus},${c.temperature},${c.activity}`);
      const sectionF = [
        `F. TERNAK YANG MEMERLUKAN PERHATIAN`,
        headersF.join(','),
        ...(rowsF.length > 0 ? rowsF : ['Tidak ada ternak yang memerlukan perhatian hari ini.']),
      ].join('\n');

      const csvContent = [sectionA, sectionB, sectionC, sectionD, sectionE, sectionF].join('\n');
      
      const fileName = `Laporan_AgriTrack_${dateStr}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Ekspor Laporan Ternak',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Berbagi Tidak Tersedia', 'Fitur berbagi file tidak tersedia di perangkat ini.');
      }
    } catch (error) {
      Alert.alert('Ekspor Gagal', 'Terjadi kesalahan saat membuat laporan.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.title}>Laporan</Text>
          <View style={styles.subtitleRow}>
            <Calendar size={14} color={COLORS.textLight} style={{ marginRight: 5 }} />
            <Text style={styles.subtitle}>{user?.farmName || 'Peternakan'} • Hari Ini</Text>
          </View>
        </View>

        {/* ── Summary KPI row ── */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { flex: 1.2 }]}>
            <View style={styles.kpiHeader}>
              <View style={[styles.kpiIconBox, { backgroundColor: COLORS.softGreen }]}>
                <Users size={14} color={COLORS.primary} />
              </View>
              <Text style={styles.kpiLabel}>TOTAL TERNAK</Text>
            </View>
            <Text style={styles.kpiValue}>{totalLivestock}</Text>
            <Text style={styles.kpiTrend}>Bulan ini</Text>
          </View>

          <View style={[styles.kpiCard, { flex: 1 }]}>
            <View style={styles.kpiHeader}>
              <View style={[styles.kpiIconBox, { backgroundColor: COLORS.successBg }]}>
                <HeartPulse size={14} color={COLORS.success} />
              </View>
              <Text style={styles.kpiLabel}>SEHAT</Text>
            </View>
            <Text style={[styles.kpiValue, { color: COLORS.success }]}>{healthyCount}</Text>
            <Text style={[styles.kpiTrend, { color: COLORS.success }]}>Kondisi baik</Text>
          </View>

          <View style={[styles.kpiCard, { flex: 1 }]}>
            <View style={styles.kpiHeader}>
              <View style={[styles.kpiIconBox, { backgroundColor: COLORS.warningBg }]}>
                <CircleAlert size={14} color={COLORS.warning} />
              </View>
              <Text style={styles.kpiLabel}>PERHATIAN</Text>
            </View>
            <Text style={[styles.kpiValue, { color: COLORS.warning }]}>{attentionCount + criticalCount}</Text>
            <Text style={[styles.kpiTrend, { color: COLORS.warning }]}>Perlu cek</Text>
          </View>
        </View>

        {/* ── Methane Emissions ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Activity size={16} color={COLORS.primary} style={{ marginRight: 7 }} />
              <Text style={styles.sectionTitle}>Emisi Metana</Text>
            </View>
            <Text style={styles.sectionTag}>Est. Bulanan</Text>
          </View>
          <View style={styles.chartCard}>
            {MOCK_METHANE.map((item, index) => (
              <View key={index} style={styles.barRow}>
                <Text style={styles.barLabel}>{item.name}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      { width: `${(item.value / 50) * 100}%` },
                      index === 0 && { backgroundColor: COLORS.primaryDark },
                    ]}
                  />
                </View>
                <Text style={styles.barValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Farmer Data ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <ChartBar size={16} color={COLORS.primary} style={{ marginRight: 7 }} />
              <Text style={styles.sectionTitle}>Ringkasan Peternak</Text>
            </View>
          </View>
          {MOCK_FARMERS.map(farmer => {
            const { color, bg } = getFarmerStatus(farmer.status);
            return (
              <View key={farmer.id} style={styles.farmerCard}>
                <View style={styles.farmerAvatar}>
                  <Text style={styles.farmerInitial}>
                    {farmer.name.split(' ')[0][0]}{farmer.name.split(' ').pop()[0]}
                  </Text>
                </View>
                <View style={styles.farmerInfo}>
                  <Text style={styles.farmerName}>{farmer.name}</Text>
                  <Text style={styles.farmerDetails}>{farmer.cattle} Sapi</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: bg }]}>
                  <Text style={[styles.badgeText, { color }]}>{farmer.status}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Export ── */}
        <Pressable
          style={({ pressed }) => [styles.exportButton, pressed && styles.exportPressed]}
          onPress={handleExport}
        >
          <Download size={20} color={COLORS.surface} style={{ marginRight: 10 }} />
          <Text style={styles.exportButtonText}>Ekspor Laporan</Text>
        </Pressable>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: SIZES.pagePadding,
    paddingTop: SIZES.sm,
    paddingBottom: 16,
  },
  header: {
    marginBottom: SIZES.lg,
    paddingTop: SIZES.xs,
  },
  title: {
    ...FONTS.screenTitle,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textLight,
  },

  // KPI
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SIZES.lg,
  },
  kpiCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    ...SHADOWS.card,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  kpiIconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textLight,
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primaryDark,
    letterSpacing: -0.5,
    marginBottom: 3,
  },
  kpiTrend: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.success,
  },

  // Section
  section: {
    marginBottom: SIZES.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    ...FONTS.sectionTitle,
  },
  sectionTag: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },

  // Chart
  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 18,
    ...SHADOWS.card,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  barLabel: {
    width: 76,
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: COLORS.border,
    borderRadius: 5,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: COLORS.secondary,
    borderRadius: 5,
  },
  barValue: {
    width: 26,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
    textAlign: 'right',
  },

  // Farmer cards
  farmerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: RADIUS.lg,
    marginBottom: 10,
    ...SHADOWS.card,
  },
  farmerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  farmerInitial: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  farmerInfo: { flex: 1 },
  farmerName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  farmerDetails: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 3,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.round,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Export
  exportButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryDark,
    padding: 16,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.button,
  },
  exportPressed: {
    backgroundColor: COLORS.primary,
  },
  exportButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '700',
  },
});
