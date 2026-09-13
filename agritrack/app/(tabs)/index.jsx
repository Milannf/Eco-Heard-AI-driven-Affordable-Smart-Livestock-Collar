import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, FONTS, SIZES, RADIUS, SHADOWS } from '../../constants/theme';
import { Bell, User, TriangleAlert, HeartPulse, ChevronRight, Leaf, Activity, CloudFog } from 'lucide-react-native';
import { MOCK_LIVESTOCK } from '../../data/livestock';
import { useAuth } from '../../context/AuthContext';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Dynamic counts based on actual mock data
  const totalLivestock = MOCK_LIVESTOCK.length;
  const healthyCount = MOCK_LIVESTOCK.filter(c => c.healthStatus === 'Sehat').length;
  const attentionCount = MOCK_LIVESTOCK.filter(c => c.healthStatus === 'Perlu Perhatian').length;
  const criticalCount = MOCK_LIVESTOCK.filter(c => c.healthStatus === 'Kritis').length;

  const healthPercent = totalLivestock > 0 ? Math.round((healthyCount / totalLivestock) * 100) : 0;

  const needsAttentionCattle = MOCK_LIVESTOCK.filter(
    c => c.healthStatus === 'Perlu Perhatian' || c.healthStatus === 'Kritis'
  ).slice(0, 3);

  const criticalCattle = MOCK_LIVESTOCK.find(c => c.healthStatus === 'Kritis');

  const getHour = () => new Date().getHours();
  const getGreeting = () => {
    const h = getHour();
    if (h < 12) return 'Selamat pagi';
    if (h < 15) return 'Selamat siang';
    if (h < 18) return 'Selamat sore';
    return 'Selamat malam';
  };

  const firstName = user?.name?.split(' ')[0] || 'Peternak';

  // Methane summary (simulated based on mock data)
  const totalMethaneToday = MOCK_LIVESTOCK.reduce((acc, c) => acc + (c.methaneEmissionToday || 0), 0);
  const totalMethaneYesterday = MOCK_LIVESTOCK.reduce((acc, c) => acc + (c.methaneEmissionYesterday || 0), 0);
  const avgMethane = totalLivestock > 0 ? Math.round(totalMethaneToday / totalLivestock) : 0;
  const methaneChange = totalMethaneYesterday > 0 ? Math.round(((totalMethaneToday - totalMethaneYesterday) / totalMethaneYesterday) * 100) : 0;
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable style={styles.headerLeft} onPress={() => router.push('/profile')}>
            <View style={styles.avatar}>
              <User size={18} color={COLORS.surface} />
            </View>
            <View>
              <Text style={styles.greeting}>{getGreeting()}, {firstName}</Text>
              <Text style={styles.location}>
                {user?.farmName || 'Peternakan Saya'} • {user?.location || 'Indonesia'}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(tabs)/notifications')}
            style={styles.bellBtn}
          >
            <Bell size={22} color={COLORS.primaryDark} />
            <View style={styles.badgeDot} />
          </Pressable>
        </View>

        {/* ── Intro ── */}
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Ringkasan Ternak</Text>
          <Text style={styles.introSubtitle}>Kondisi ternak Anda hari ini.</Text>
        </View>

        {/* ── Critical Alert ── */}
        {criticalCattle && (
          <Pressable
            style={styles.alertBanner}
            onPress={() => router.push(`/livestock/${criticalCattle.id}`)}
          >
            <View style={styles.alertIconBox}>
              <TriangleAlert size={18} color={COLORS.warning} />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertLabel}>PERLU PERHATIAN</Text>
              <Text style={styles.alertDesc}>
                {criticalCattle.displayId} — aktivitas {criticalCattle.activity.toLowerCase()} terdeteksi.
              </Text>
            </View>
            <ChevronRight size={18} color={COLORS.warning} />
          </Pressable>
        )}

        {/* ── KPI Row ── */}
        <View style={styles.kpiRow}>
          {/* Total Livestock */}
          <View style={[styles.kpiCardLarge, styles.kpiCardGreen]}>
            <View style={styles.kpiIconRow}>
              <View style={styles.kpiIconBox}>
                <Activity size={16} color={COLORS.surface} />
              </View>
              <Text style={styles.kpiLabelWhite}>TOTAL</Text>
            </View>
            <Text style={styles.kpiValueLarge}>{totalLivestock}</Text>
            <Text style={styles.kpiSubWhite}>Ternak</Text>
          </View>

          <View style={styles.kpiCol}>
            {/* Herd Health */}
            <View style={styles.kpiCardSmall}>
              <View style={styles.kpiSmallHeader}>
                <HeartPulse size={13} color={COLORS.success} />
                <Text style={styles.kpiLabelGreen}>KESEHATAN</Text>
              </View>
              <Text style={styles.kpiValueSmall}>{healthPercent}%</Text>
            </View>

            {/* Needs Attention */}
            <View style={styles.kpiCardSmall}>
              <View style={styles.kpiSmallHeader}>
                <TriangleAlert size={13} color={COLORS.warning} />
                <Text style={styles.kpiLabelWarning}>PERHATIAN</Text>
              </View>
              <Text style={[styles.kpiValueSmall, { color: COLORS.warning }]}>
                {attentionCount + criticalCount}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Health Summary Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ringkasan Kesehatan</Text>

          <View style={styles.healthStats}>
            <View style={styles.healthStatItem}>
              <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.healthLabel}>Sehat</Text>
              <Text style={[styles.healthValue, { color: COLORS.success }]}>{healthyCount}</Text>
            </View>
            <View style={styles.healthStatItem}>
              <View style={[styles.statusDot, { backgroundColor: COLORS.warning }]} />
              <Text style={styles.healthLabel}>Perhatian</Text>
              <Text style={[styles.healthValue, { color: COLORS.warning }]}>{attentionCount}</Text>
            </View>
            <View style={styles.healthStatItem}>
              <View style={[styles.statusDot, { backgroundColor: COLORS.danger }]} />
              <Text style={styles.healthLabel}>Kritis</Text>
              <Text style={[styles.healthValue, { color: COLORS.danger }]}>{criticalCount}</Text>
            </View>
          </View>

          {/* Segmented progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressSeg, {
              flex: healthyCount || 1,
              backgroundColor: COLORS.success,
              borderTopLeftRadius: 6,
              borderBottomLeftRadius: 6,
            }]} />
            {attentionCount > 0 && (
              <View style={[styles.progressSeg, {
                flex: attentionCount,
                backgroundColor: COLORS.warning,
              }]} />
            )}
            {criticalCount > 0 && (
              <View style={[styles.progressSeg, {
                flex: criticalCount,
                backgroundColor: COLORS.danger,
                borderTopRightRadius: 6,
                borderBottomRightRadius: 6,
              }]} />
            )}
          </View>

          <View style={styles.progressLegend}>
            <Text style={styles.legendText}>0</Text>
            <Text style={styles.legendText}>Total {totalLivestock} ternak</Text>
          </View>
        </View>

        {/* ── Methane Dashboard ── */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderNoMargin}>
            <View style={styles.iconTitleRow}>
              <CloudFog size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>Emisi Metana</Text>
            </View>
            <Pressable onPress={() => router.push('/methane')}>
              <Text style={styles.viewAll}>Lihat Detail</Text>
            </Pressable>
          </View>

          <View style={styles.methaneSummary}>
            <View style={styles.methaneBox}>
              <Text style={styles.methaneLabel}>Estimasi Hari Ini</Text>
              <Text style={styles.methaneValue}>{totalMethaneToday} <Text style={styles.methaneUnit}>L</Text></Text>
            </View>
            <View style={styles.methaneBox}>
              <Text style={styles.methaneLabel}>Rata-rata/Ternak</Text>
              <Text style={styles.methaneValue}>{avgMethane} <Text style={styles.methaneUnit}>L</Text></Text>
            </View>
            <View style={styles.methaneBox}>
              <Text style={styles.methaneLabel}>Perubahan</Text>
              <Text style={[styles.methaneValue, { color: methaneChange > 0 ? COLORS.danger : COLORS.success }]}>
                {methaneChange > 0 ? '+' : ''}{methaneChange}%
              </Text>
            </View>
          </View>
        </View>

        {/* ── Needs Attention ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Perlu Perhatian</Text>
          <Pressable onPress={() => router.push('/(tabs)/livestock')}>
            <Text style={styles.viewAll}>Lihat Semua</Text>
          </Pressable>
        </View>

        {needsAttentionCattle.length > 0 ? (
          needsAttentionCattle.map(cattle => {
            const isWarning = cattle.healthStatus === 'Perlu Perhatian';
            const statusColor = isWarning ? COLORS.warning : COLORS.danger;
            const statusBg = isWarning ? COLORS.warningBg : COLORS.dangerBg;
            return (
              <Pressable
                key={cattle.id}
                style={styles.livestockCard}
                onPress={() => router.push(`/livestock/${cattle.id}`)}
              >
                <View style={[styles.livestockInitial, { backgroundColor: COLORS.softGreen }]}>
                  <Text style={styles.initialText}>
                    {cattle.displayId.replace('Sapi #', '#')}
                  </Text>
                </View>
                <View style={styles.livestockInfo}>
                  <Text style={styles.cattleId}>{cattle.displayId}</Text>
                  <Text style={styles.cattleBreed}>{cattle.breed} • {cattle.barn}</Text>
                  <Text style={styles.cattleVitals}>
                    {cattle.temperature}°C • {cattle.activity}
                  </Text>
                </View>
                <View style={styles.livestockRight}>
                  <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {cattle.healthStatus}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={COLORS.border} style={{ marginTop: 6 }} />
                </View>
              </Pressable>
            );
          })
        ) : (
           <Text style={styles.emptyStateText}>Tidak ada ternak yang perlu perhatian khusus.</Text>
        )}

        {/* ── Feed Recommendation ── */}
        <View style={[styles.card, styles.feedCard]}>
          <View style={styles.feedHeader}>
            <View style={styles.feedIconBox}>
              <Leaf size={16} color={COLORS.primary} />
            </View>
            <Text style={styles.feedTitle}>Rekomendasi Pakan</Text>
          </View>
          <Text style={styles.feedName}>Hijauan Segar + Konsentrat</Text>
          <Text style={styles.feedDesc}>
            Direkomendasikan untuk kondisi ternak hari ini guna menjaga kesehatan dan produksi susu yang optimal.
          </Text>
        </View>

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

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.lg,
    paddingTop: SIZES.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    ...SHADOWS.card,
  },
  greeting: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  location: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  badgeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.danger,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },

  // Intro
  introSection: {
    marginBottom: SIZES.md,
  },
  introTitle: {
    ...FONTS.screenTitle,
  },
  introSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },

  // Alert banner
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningBg,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: SIZES.lg,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
  },
  alertIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(138,106,26,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertContent: { flex: 1 },
  alertLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.warning,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  alertDesc: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },

  // KPIs
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: SIZES.lg,
  },
  kpiCardLarge: {
    flex: 1,
    borderRadius: RADIUS.lg,
    padding: 18,
    justifyContent: 'space-between',
    minHeight: 130,
    ...SHADOWS.card,
  },
  kpiCardGreen: {
    backgroundColor: COLORS.primaryDark,
  },
  kpiIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  kpiLabelWhite: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  kpiValueLarge: {
    fontSize: 44,
    fontWeight: '800',
    color: COLORS.surface,
    letterSpacing: -1,
    lineHeight: 50,
  },
  kpiSubWhite: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
    marginTop: 2,
  },
  kpiCol: {
    flex: 1,
    gap: 10,
  },
  kpiCardSmall: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  kpiSmallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  kpiLabelGreen: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.success,
    letterSpacing: 0.3,
  },
  kpiLabelWarning: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.warning,
    letterSpacing: 0.3,
  },
  kpiValueSmall: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primaryDark,
    letterSpacing: -0.5,
  },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 20,
    marginBottom: SIZES.lg,
    ...SHADOWS.card,
  },
  cardTitle: {
    ...FONTS.cardTitle,
    marginBottom: 14,
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeaderNoMargin: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Health summary
  healthStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  healthStatItem: {
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  healthLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  healthValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  progressTrack: {
    height: 10,
    flexDirection: 'row',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: COLORS.border,
    gap: 1,
  },
  progressSeg: {
    height: '100%',
  },
  progressLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },

  // Methane Summary
  methaneSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.veryLight,
    padding: 14,
    borderRadius: RADIUS.md,
  },
  methaneBox: {
    flex: 1,
    alignItems: 'center',
  },
  methaneLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  methaneValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  methaneUnit: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    ...FONTS.sectionTitle,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Livestock card
  livestockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 10,
    ...SHADOWS.card,
  },
  livestockInitial: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  initialText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  livestockInfo: { flex: 1 },
  cattleId: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  cattleBreed: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
    marginBottom: 4,
  },
  cattleVitals: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  livestockRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyStateText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginBottom: 16,
  },

  // Feed recommendation
  feedCard: {
    borderWidth: 1,
    borderColor: COLORS.softGreen,
    backgroundColor: COLORS.veryLight,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  feedIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  feedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  feedName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginBottom: 6,
  },
  feedDesc: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 19,
  },
});
