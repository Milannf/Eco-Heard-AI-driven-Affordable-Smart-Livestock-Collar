import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable, Alert } from 'react-native';
import { COLORS, FONTS, SIZES, RADIUS, SHADOWS } from '../../constants/theme';
import { Calendar, TrendingUp, AlertCircle, Download, Users } from 'lucide-react-native';
import { MOCK_LIVESTOCK } from '../../data/livestock';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const MOCK_METHANE = [
  { name: 'Sutrisno', value: 42 },
  { name: 'Budi A.', value: 38 },
  { name: 'Ani S.', value: 35 },
  { name: 'Dono', value: 32 },
  { name: 'Haryanto', value: 29 },
];

const MOCK_FARMERS = [
  { id: '1', name: 'Haryanto', cattle: 24, status: 'Healthy' },
  { id: '2', name: 'Sutrisno', cattle: 20, status: 'Needs Check' },
  { id: '3', name: 'Dono S.', cattle: 18, status: 'Healthy' },
  { id: '4', name: 'Maman', cattle: 12, status: 'Critical' },
];

export default function ReportsScreen() {
  const totalLivestock = MOCK_LIVESTOCK.length;

  const renderFarmerStatus = (status) => {
    if (status === 'Healthy') return { color: COLORS.success, bg: COLORS.successBg };
    if (status === 'Needs Check') return { color: COLORS.warning, bg: COLORS.warningBg };
    return { color: COLORS.danger, bg: COLORS.dangerBg };
  };

  const handleExport = async () => {
    try {
      // 1. Generate CSV content
      const headers = ['Livestock ID', 'Breed', 'Temperature', 'Activity', 'Health Status', 'Barn', 'Weight'];
      const rows = MOCK_LIVESTOCK.map(c => 
        `${c.displayId},${c.breed},${c.temperature},${c.activity},${c.healthStatus},${c.barn},${c.weight}`
      );
      const csvContent = [headers.join(','), ...rows].join('\n');

      // 2. Save locally
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `AgriTrack_Livestock_Report_${dateStr}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // 3. Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Livestock Report',
          UTI: 'public.comma-separated-values-text'
        });
      } else {
        Alert.alert('Sharing Unavailable', 'File sharing is not available on your device.');
      }
    } catch (error) {
      Alert.alert('Export Failed', 'An error occurred while generating the report.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Reports</Text>
          <View style={styles.subtitleRow}>
            <Calendar size={16} color={COLORS.textLight} style={{ marginRight: 6 }} />
            <Text style={styles.subtitle}>KUD Sumber Makmur • 1–31 Oct 2026</Text>
          </View>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiContainer}>
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>TOTAL LIVESTOCK</Text>
              <Users size={16} color={COLORS.primary} />
            </View>
            <Text style={styles.kpiValue}>{totalLivestock}</Text>
            <Text style={styles.kpiTrend}>+12 this month</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>EST. METHANE (MO)</Text>
              <TrendingUp size={16} color={COLORS.warning} />
            </View>
            <Text style={styles.kpiValue}>42.5 <Text style={{fontSize: 16}}>tons</Text></Text>
            <Text style={[styles.kpiTrend, { color: COLORS.danger }]}>+4% vs last month</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>REQUIRES FOLLOW-UP</Text>
              <AlertCircle size={16} color={COLORS.danger} />
            </View>
            <Text style={styles.kpiValue}>8 <Text style={{fontSize: 16}}>Farmers</Text></Text>
            <Text style={[styles.kpiTrend, { color: COLORS.danger }]}>Attention Required</Text>
          </View>
        </View>

        {/* Methane Analytics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Methane Emissions by Farmer</Text>
            <Text style={styles.linkText}>Top 10</Text>
          </View>
          <View style={styles.chartCard}>
            {MOCK_METHANE.map((item, index) => (
              <View key={index} style={styles.barRow}>
                <Text style={styles.barLabel}>{item.name}</Text>
                <View style={styles.barContainer}>
                  <View style={[styles.bar, { width: `${(item.value / 50) * 100}%` }]} />
                </View>
                <Text style={styles.barValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Farmer Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Farmer Data</Text>
          {MOCK_FARMERS.map(farmer => {
            const statusStyle = renderFarmerStatus(farmer.status);
            return (
              <View key={farmer.id} style={styles.farmerCard}>
                <View>
                  <Text style={styles.farmerName}>{farmer.name}</Text>
                  <Text style={styles.farmerDetails}>{farmer.cattle} Cattle</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.badgeText, { color: statusStyle.color }]}>{farmer.status}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Export CTA */}
        <Pressable 
          style={styles.exportButton}
          onPress={handleExport}
        >
          <Download size={20} color={COLORS.surface} style={{ marginRight: 8 }} />
          <Text style={styles.exportButtonText}>Export Report</Text>
        </Pressable>

        <View style={{height: 30}} />
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
    padding: SIZES.pagePadding,
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
    marginTop: 6,
  },
  subtitle: {
    ...FONTS.body,
    color: COLORS.textLight,
  },
  kpiContainer: {
    marginBottom: SIZES.lg,
  },
  kpiCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.card,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginBottom: 4,
  },
  kpiTrend: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  section: {
    marginBottom: SIZES.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    ...FONTS.sectionTitle,
  },
  linkText: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.primary,
  },
  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOWS.card,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  barLabel: {
    width: 65,
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  barContainer: {
    flex: 1,
    height: 12,
    backgroundColor: COLORS.border,
    borderRadius: 6,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: COLORS.secondary,
    borderRadius: 6,
  },
  barValue: {
    width: 24,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryDark,
    textAlign: 'right',
  },
  farmerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.lg,
    marginBottom: 12,
    ...SHADOWS.card,
  },
  farmerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  farmerDetails: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.round,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  exportButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryDark,
    padding: 16,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  exportButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '700',
  }
});
